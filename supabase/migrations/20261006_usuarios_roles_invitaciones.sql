-- ════════════════════════════════════════════════════════════════════════════
-- Múltiples usuarios por taller, con roles (dueño, recepción, mecánico).
--
-- CÓMO CORRERLA
--   1. Antes, tiene que estar corrida 20261005_tipo_trabajo_cancelado_mensaje.sql.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre dentro de una transacción: si algo falla, no se aplica nada.
--
-- QUÉ HACE
--   1. usuarios: columnas rol ('dueno' | 'recepcion' | 'mecanico') y activo.
--      Los usuarios que ya existen quedan como dueño y activos.
--   2. Tabla invitaciones (solo el dueño las ve, crea y borra).
--   3. Funciones mi_taller_id() y mi_rol() (solo cuentan usuarios activos).
--   4. Reemplaza TODAS las políticas de talleres, usuarios, clientes, vehiculos,
--      ordenes_trabajo e items_orden por políticas por rol.
--   5. handle_new_user: con token de invitación se une al taller existente;
--      sin token crea un taller nuevo (igual que antes).
--   6. Protecciones en usuarios: nadie cambia su propio rol ni se desactiva,
--      y el taller nunca se queda sin un dueño activo.
--   7. El km del vehículo se actualiza desde la base al terminar/entregar una
--      orden (el mecánico no tiene permiso para editar vehículos).
--
-- RLS queda activo en todas las tablas. No usa service_role.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Rol y estado de cada usuario ────────────────────────────────────────

alter table public.usuarios
  add column if not exists rol text not null default 'dueno',
  add column if not exists activo boolean not null default true;

alter table public.usuarios drop constraint if exists usuarios_rol_check;
alter table public.usuarios
  add constraint usuarios_rol_check check (rol in ('dueno', 'recepcion', 'mecanico'));


-- ─── 2. Funciones de identidad (usadas por todas las políticas) ─────────────
-- security definer: leen usuarios sin pasar por RLS (evita recursión).
-- search_path vacío: todo con nombre de esquema, sin riesgo de suplantación.
-- Un usuario desactivado no tiene taller ni rol → no ve ni modifica nada.

create or replace function public.mi_taller_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.taller_id
  from public.usuarios u
  where u.id = (select auth.uid()) and u.activo
$$;

create or replace function public.mi_rol()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.rol
  from public.usuarios u
  where u.id = (select auth.uid()) and u.activo
$$;

revoke execute on function public.mi_taller_id() from public, anon;
revoke execute on function public.mi_rol() from public, anon;
grant execute on function public.mi_taller_id() to authenticated;
grant execute on function public.mi_rol() to authenticated;


-- ─── 3. Invitaciones ────────────────────────────────────────────────────────

create table if not exists public.invitaciones (
  id          uuid primary key default gen_random_uuid(),
  taller_id   uuid not null references public.talleres (id) on delete cascade,
  email       text not null check (email = lower(trim(email)) and email like '%_@_%'),
  rol         text not null check (rol in ('dueno', 'recepcion', 'mecanico')),
  -- 64 caracteres hexadecimales aleatorios (dos UUID v4 sin guiones).
  token       text not null unique
              default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  creada_por  uuid references public.usuarios (id) on delete set null default auth.uid(),
  creada_en   timestamptz not null default now(),
  vence_en    timestamptz not null default now() + interval '7 days',
  usada_en    timestamptz
);

create index if not exists invitaciones_taller_id_idx on public.invitaciones (taller_id);

alter table public.invitaciones enable row level security;

revoke all on public.invitaciones from anon;
grant select, insert, delete on public.invitaciones to authenticated;

-- Para /registro?invitacion=TOKEN: el visitante todavía no tiene sesión, así que
-- no puede leer la tabla. Esta función devuelve solo lo necesario y solo si el
-- token es válido (adivinar un token de 64 caracteres no es factible).
create or replace function public.info_invitacion(p_token text)
returns table (taller_nombre text, email text, rol text)
language sql
stable
security definer
set search_path = ''
as $$
  select t.nombre, i.email, i.rol
  from public.invitaciones i
  join public.talleres t on t.id = i.taller_id
  where i.token = p_token
    and i.usada_en is null
    and i.vence_en > now()
$$;

revoke execute on function public.info_invitacion(text) from public;
grant execute on function public.info_invitacion(text) to anon, authenticated;


-- ─── 4. Políticas por rol ───────────────────────────────────────────────────

-- Asegurar RLS activo.
alter table public.talleres        enable row level security;
alter table public.usuarios        enable row level security;
alter table public.clientes        enable row level security;
alter table public.vehiculos       enable row level security;
alter table public.ordenes_trabajo enable row level security;
alter table public.items_orden     enable row level security;

-- Borrar las políticas actuales de estas tablas, se llamen como se llamen.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('talleres', 'usuarios', 'clientes', 'vehiculos',
                        'ordenes_trabajo', 'items_orden', 'invitaciones')
  loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- talleres: leen todos los miembros; actualiza solo el dueño; nadie crea ni borra
-- (los crea handle_new_user).
create policy "talleres: leer miembros" on public.talleres
  for select to authenticated
  using (id = (select public.mi_taller_id()));

create policy "talleres: actualizar dueño" on public.talleres
  for update to authenticated
  using (id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno')
  with check (id = (select public.mi_taller_id()));

-- usuarios: leen todos los miembros (y cada uno su propia fila, aunque esté
-- desactivado, para poder avisarle). Insertar/actualizar/borrar: solo el dueño.
-- Las reglas "no cambiar tu propio rol" y "siempre un dueño activo" están en el
-- trigger de la sección 6.
create policy "usuarios: leer miembros" on public.usuarios
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()) or id = (select auth.uid()));

create policy "usuarios: insertar dueño" on public.usuarios
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

create policy "usuarios: actualizar dueño" on public.usuarios
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno')
  with check (taller_id = (select public.mi_taller_id()));

create policy "usuarios: borrar dueño" on public.usuarios
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

-- clientes: leen todos; crean y editan dueño y recepción; borra solo el dueño.
create policy "clientes: leer miembros" on public.clientes
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "clientes: crear dueño y recepción" on public.clientes
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion'));

create policy "clientes: editar dueño y recepción" on public.clientes
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion'))
  with check (taller_id = (select public.mi_taller_id()));

create policy "clientes: borrar dueño" on public.clientes
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

-- vehiculos: igual que clientes. Además el cliente tiene que ser del mismo taller.
create policy "vehiculos: leer miembros" on public.vehiculos
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "vehiculos: crear dueño y recepción" on public.vehiculos
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion')
              and exists (select 1 from public.clientes c
                          where c.id = cliente_id and c.taller_id = (select public.mi_taller_id())));

create policy "vehiculos: editar dueño y recepción" on public.vehiculos
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion'))
  with check (taller_id = (select public.mi_taller_id())
              and exists (select 1 from public.clientes c
                          where c.id = cliente_id and c.taller_id = (select public.mi_taller_id())));

create policy "vehiculos: borrar dueño" on public.vehiculos
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

-- ordenes_trabajo: leen todos; crean y editan los tres roles; borra solo el dueño.
-- El vehículo tiene que ser del mismo taller.
create policy "ordenes: leer miembros" on public.ordenes_trabajo
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "ordenes: crear miembros" on public.ordenes_trabajo
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico')
              and exists (select 1 from public.vehiculos v
                          where v.id = vehiculo_id and v.taller_id = (select public.mi_taller_id())));

create policy "ordenes: editar miembros" on public.ordenes_trabajo
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico'))
  with check (taller_id = (select public.mi_taller_id())
              and exists (select 1 from public.vehiculos v
                          where v.id = vehiculo_id and v.taller_id = (select public.mi_taller_id())));

create policy "ordenes: borrar dueño" on public.ordenes_trabajo
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

-- items_orden: leen todos; crean, editan y quitan líneas los tres roles.
-- La orden tiene que ser del mismo taller.
create policy "items: leer miembros" on public.items_orden
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "items: crear miembros" on public.items_orden
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico')
              and exists (select 1 from public.ordenes_trabajo o
                          where o.id = orden_id and o.taller_id = (select public.mi_taller_id())));

create policy "items: editar miembros" on public.items_orden
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico'))
  with check (taller_id = (select public.mi_taller_id())
              and exists (select 1 from public.ordenes_trabajo o
                          where o.id = orden_id and o.taller_id = (select public.mi_taller_id())));

-- Quitar una línea cargada por error es parte de editar la orden: lo pueden
-- hacer los tres roles. (Borrar la orden entera sigue siendo solo del dueño.)
create policy "items: borrar miembros" on public.items_orden
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id())
         and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico'));

-- invitaciones: solo el dueño de ese taller ve, crea y borra. Nadie las edita
-- (handle_new_user las marca como usadas sin pasar por RLS).
create policy "invitaciones: leer dueño" on public.invitaciones
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

create policy "invitaciones: crear dueño" on public.invitaciones
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) = 'dueno'
              and creada_por = (select auth.uid())
              and usada_en is null
              and vence_en <= now() + interval '7 days');

create policy "invitaciones: borrar dueño" on public.invitaciones
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');


-- ─── 5. Alta de usuarios (registro) ─────────────────────────────────────────
-- Metadata que manda la app en signUp:
--   sin invitación: { nombre, taller_nombre }  → taller nuevo, rol dueño
--   con invitación: { nombre, invitacion }     → se une al taller de la invitación

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token     text := nullif(trim(new.raw_user_meta_data ->> 'invitacion'), '');
  v_nombre    text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
                               split_part(new.email, '@', 1));
  v_inv       public.invitaciones%rowtype;
  v_taller_id uuid;
begin
  if v_token is not null then
    select * into v_inv
    from public.invitaciones i
    where i.token = v_token
      and i.usada_en is null
      and i.vence_en > now()
      and i.email = lower(trim(new.email))
    for update;

    if not found then
      raise exception 'La invitación no es válida: ya se usó, venció o es para otro email.'
        using errcode = 'P0001';
    end if;

    insert into public.usuarios (id, taller_id, nombre, email, rol)
    values (new.id, v_inv.taller_id, v_nombre, new.email, v_inv.rol);

    update public.invitaciones set usada_en = now() where id = v_inv.id;
  else
    insert into public.talleres (nombre)
    values (coalesce(nullif(trim(new.raw_user_meta_data ->> 'taller_nombre'), ''), 'Mi taller'))
    returning id into v_taller_id;

    insert into public.usuarios (id, taller_id, nombre, email, rol)
    values (new.id, v_taller_id, v_nombre, new.email, 'dueno');
  end if;

  return new;
end;
$$;

-- Si por algún motivo el trigger no existe, crearlo (si ya existe, no se duplica).
do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgfoid = 'public.handle_new_user'::regproc
      and not tgisinternal
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;


-- ─── 6. Protecciones sobre usuarios ─────────────────────────────────────────

create or replace function public.usuarios_proteger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deja_de_ser_dueno boolean;
begin
  -- (En un DELETE no existe "new": por eso se separa por tg_op.)
  if tg_op = 'UPDATE' then
    -- Nadie mueve un usuario de taller ni le cambia el id.
    if new.id <> old.id or new.taller_id <> old.taller_id then
      raise exception 'No se puede cambiar el taller de un usuario.' using errcode = 'P0001';
    end if;
    -- Nadie cambia su propio rol ni se desactiva.
    -- (auth.uid() es null cuando se opera desde el panel de Supabase.)
    if old.id = (select auth.uid()) and (new.rol <> old.rol or new.activo <> old.activo) then
      raise exception 'No podés cambiar tu propio rol ni desactivarte.' using errcode = 'P0001';
    end if;
    v_deja_de_ser_dueno := new.rol <> 'dueno' or not new.activo;
  else
    if old.id = (select auth.uid()) then
      raise exception 'No podés borrar tu propio usuario.' using errcode = 'P0001';
    end if;
    v_deja_de_ser_dueno := true;
  end if;

  -- El taller siempre tiene que tener al menos un dueño activo.
  if old.rol = 'dueno' and old.activo and v_deja_de_ser_dueno then
    -- Bloquear el taller para que dos cambios simultáneos no dejen cero dueños.
    perform 1 from public.talleres t where t.id = old.taller_id for update;
    if not exists (
      select 1 from public.usuarios u
      where u.taller_id = old.taller_id and u.id <> old.id and u.rol = 'dueno' and u.activo
    ) then
      raise exception 'El taller tiene que tener al menos un dueño activo.' using errcode = 'P0001';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists usuarios_proteger on public.usuarios;
create trigger usuarios_proteger
  before update or delete on public.usuarios
  for each row execute function public.usuarios_proteger();


-- ─── 7. Kilometraje del vehículo al cerrar una orden ────────────────────────
-- Antes lo actualizaba la app editando vehiculos, pero el mecánico no puede
-- editar vehículos. Ahora lo hace la base al guardar la orden.

create or replace function public.actualizar_km_vehiculo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.estado in ('terminado', 'entregado') and new.km_ingreso is not null then
    update public.vehiculos v
    set km_actual = new.km_ingreso
    where v.id = new.vehiculo_id
      and v.taller_id = new.taller_id
      and (v.km_actual is null or v.km_actual < new.km_ingreso);
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_actualizar_km on public.ordenes_trabajo;
create trigger ordenes_actualizar_km
  after insert or update of estado, km_ingreso on public.ordenes_trabajo
  for each row execute function public.actualizar_km_vehiculo();

commit;

-- Recargar el esquema de la API para que lo nuevo se vea enseguida.
notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (opcional, correr después por separado):
--
--   select id, nombre, rol, activo from public.usuarios;          -- todos 'dueno'
--   select tablename, policyname, cmd from pg_policies
--     where schemaname = 'public' order by tablename, cmd;        -- políticas nuevas
--   select tgname from pg_trigger
--     where tgrelid = 'auth.users'::regclass and not tgisinternal; -- un solo trigger
-- ════════════════════════════════════════════════════════════════════════════
