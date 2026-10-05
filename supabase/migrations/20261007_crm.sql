-- ════════════════════════════════════════════════════════════════════════════
-- CRM para talleres: origen y etiquetas de clientes, interacciones,
-- seguimientos, vencimientos de vehículos (VTV, seguro) y posventa automática.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas, en orden:
--        20261005_tipo_trabajo_cancelado_mensaje.sql
--        20261006_usuarios_roles_invitaciones.sql   (crea mi_taller_id() y mi_rol())
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre dentro de una transacción: si algo falla, no se aplica nada.
--      Se puede correr más de una vez.
--
-- AISLAMIENTO ENTRE TALLERES
--   Las tablas nuevas usan claves foráneas compuestas (taller_id, x_id): la base
--   rechaza, por ejemplo, una interacción del taller A que apunte a un cliente
--   del taller B, aunque alguien se saltee la app. Para eso se agrega
--   unique (taller_id, id) a clientes, vehiculos, ordenes_trabajo y usuarios.
--
-- PERMISOS (mismo patrón que 20261006)
--   Leer: todos los miembros activos del taller.
--   Crear y editar: dueño y recepción. El mecánico solo puede crear notas.
--   Borrar: solo el dueño.
--
-- RLS queda activo en todas las tablas. No usa service_role.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Claves únicas (taller_id, id) para las claves compuestas ────────────

do $$
declare
  t text;
begin
  foreach t in array array['clientes', 'vehiculos', 'ordenes_trabajo', 'usuarios'] loop
    if not exists (
      select 1 from pg_constraint
      where conrelid = format('public.%I', t)::regclass and conname = t || '_taller_id_id_key'
    ) then
      execute format('alter table public.%I add constraint %I unique (taller_id, id)', t, t || '_taller_id_id_key');
    end if;
  end loop;
end $$;


-- ─── 2. Clientes: origen y etiquetas ────────────────────────────────────────

alter table public.clientes
  add column if not exists origen text,
  add column if not exists etiquetas text[] not null default '{}';

-- (Las políticas de clientes de 20261006 ya cubren estas columnas.)
create index if not exists clientes_etiquetas_idx on public.clientes using gin (etiquetas);


-- ─── 3. Interacciones (línea de tiempo del cliente) ─────────────────────────

create table if not exists public.interacciones (
  id          uuid primary key default gen_random_uuid(),
  taller_id   uuid not null references public.talleres (id) on delete cascade,
  cliente_id  uuid not null,
  vehiculo_id uuid,
  tipo        text not null check (tipo in ('nota', 'whatsapp', 'llamada', 'presupuesto', 'posventa')),
  texto       text not null check (length(trim(texto)) between 1 and 4000),
  creado_por  uuid default auth.uid(),
  creado_en   timestamptz not null default now(),

  foreign key (taller_id, cliente_id)  references public.clientes  (taller_id, id) on delete cascade,
  foreign key (taller_id, vehiculo_id) references public.vehiculos (taller_id, id) on delete set null (vehiculo_id),
  foreign key (taller_id, creado_por)  references public.usuarios  (taller_id, id) on delete set null (creado_por)
);

create index if not exists interacciones_cliente_idx on public.interacciones (taller_id, cliente_id, creado_en desc);


-- ─── 4. Seguimientos (tareas) ───────────────────────────────────────────────

create table if not exists public.seguimientos (
  id          uuid primary key default gen_random_uuid(),
  taller_id   uuid not null references public.talleres (id) on delete cascade,
  cliente_id  uuid not null,
  vehiculo_id uuid,
  orden_id    uuid,
  titulo      text not null check (length(trim(titulo)) between 1 and 300),
  vence_en    date not null,
  hecha_en    timestamptz,
  asignado_a  uuid,
  creado_por  uuid default auth.uid(),
  creado_en   timestamptz not null default now(),

  foreign key (taller_id, cliente_id)  references public.clientes        (taller_id, id) on delete cascade,
  foreign key (taller_id, vehiculo_id) references public.vehiculos       (taller_id, id) on delete set null (vehiculo_id),
  foreign key (taller_id, orden_id)    references public.ordenes_trabajo (taller_id, id) on delete set null (orden_id),
  foreign key (taller_id, asignado_a)  references public.usuarios        (taller_id, id) on delete set null (asignado_a),
  foreign key (taller_id, creado_por)  references public.usuarios        (taller_id, id) on delete set null (creado_por)
);

create index if not exists seguimientos_pendientes_idx on public.seguimientos (taller_id, vence_en) where hecha_en is null;
create index if not exists seguimientos_cliente_idx on public.seguimientos (taller_id, cliente_id);


-- ─── 5. Vencimientos de vehículos (VTV, seguro) ─────────────────────────────
-- avisado_en (agregado a lo pedido): cuándo se avisó al cliente por WhatsApp
-- desde /recordatorios, igual que recordatorio_enviado_en en las órdenes.

create table if not exists public.vencimientos_vehiculo (
  id          uuid primary key default gen_random_uuid(),
  taller_id   uuid not null references public.talleres (id) on delete cascade,
  vehiculo_id uuid not null,
  tipo        text not null check (tipo in ('vtv', 'seguro', 'otro')),
  fecha       date not null,
  nota        text check (nota is null or length(nota) <= 500),
  avisado_en  timestamptz,
  creado_en   timestamptz not null default now(),

  foreign key (taller_id, vehiculo_id) references public.vehiculos (taller_id, id) on delete cascade
);

create index if not exists vencimientos_fecha_idx on public.vencimientos_vehiculo (taller_id, fecha);


-- ─── 6. Permisos ────────────────────────────────────────────────────────────

alter table public.interacciones         enable row level security;
alter table public.seguimientos          enable row level security;
alter table public.vencimientos_vehiculo enable row level security;

revoke all on public.interacciones, public.seguimientos, public.vencimientos_vehiculo from anon;
grant select, insert, update, delete on public.interacciones, public.seguimientos, public.vencimientos_vehiculo to authenticated;

-- Borrar las políticas de estas tablas (para poder correr el archivo de nuevo).
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('interacciones', 'seguimientos', 'vencimientos_vehiculo')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- interacciones: el mecánico solo puede crear notas. Cada uno firma las suyas.
create policy "interacciones: leer miembros" on public.interacciones
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "interacciones: crear" on public.interacciones
  for insert to authenticated
  with check (
    taller_id = (select public.mi_taller_id())
    and creado_por = (select auth.uid())
    and (
      (select public.mi_rol()) in ('dueno', 'recepcion')
      or ((select public.mi_rol()) = 'mecanico' and tipo = 'nota')
    )
  );

create policy "interacciones: editar dueño y recepción" on public.interacciones
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion'))
  with check (taller_id = (select public.mi_taller_id()));

create policy "interacciones: borrar dueño" on public.interacciones
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

-- seguimientos y vencimientos: leer todos; crear y editar dueño y recepción; borrar dueño.
do $$
declare
  t text;
begin
  foreach t in array array['seguimientos', 'vencimientos_vehiculo'] loop
    execute format($f$
      create policy "%1$s: leer miembros" on public.%1$I
        for select to authenticated
        using (taller_id = (select public.mi_taller_id()))
    $f$, t);
    execute format($f$
      create policy "%1$s: crear dueño y recepción" on public.%1$I
        for insert to authenticated
        with check (taller_id = (select public.mi_taller_id())
                    and (select public.mi_rol()) in ('dueno', 'recepcion'))
    $f$, t);
    execute format($f$
      create policy "%1$s: editar dueño y recepción" on public.%1$I
        for update to authenticated
        using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion'))
        with check (taller_id = (select public.mi_taller_id()))
    $f$, t);
    execute format($f$
      create policy "%1$s: borrar dueño" on public.%1$I
        for delete to authenticated
        using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno')
    $f$, t);
  end loop;
end $$;


-- ─── 7. Posventa automática ─────────────────────────────────────────────────
-- Al pasar una orden a "entregado" se crea un seguimiento para 3 días después.
-- Lo hace la base (security definer) para que funcione aunque quien entrega
-- la orden sea el mecánico, que no puede crear seguimientos.

create or replace function public.crear_seguimiento_posventa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cliente_id uuid;
begin
  if new.estado = 'entregado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'entregado') then

    select v.cliente_id into v_cliente_id
    from public.vehiculos v
    where v.id = new.vehiculo_id and v.taller_id = new.taller_id;

    -- Una sola posventa por orden (si se entrega, se reabre y se vuelve a entregar).
    if v_cliente_id is not null and not exists (
      select 1 from public.seguimientos s
      where s.orden_id = new.id and s.titulo like 'Posventa:%'
    ) then
      insert into public.seguimientos (taller_id, cliente_id, vehiculo_id, orden_id, titulo, vence_en, creado_por)
      values (
        new.taller_id, v_cliente_id, new.vehiculo_id, new.id,
        'Posventa: preguntar cómo anda el auto',
        (now() at time zone 'America/Argentina/Buenos_Aires')::date + 3,
        -- Solo si quien entrega es miembro de ese taller (si no, queda sin autor).
        (select u.id from public.usuarios u where u.id = (select auth.uid()) and u.taller_id = new.taller_id)
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_posventa on public.ordenes_trabajo;
create trigger ordenes_posventa
  after insert or update of estado on public.ordenes_trabajo
  for each row execute function public.crear_seguimiento_posventa();


-- ─── 8. Resumen de valor por cliente ────────────────────────────────────────
-- Visitas, total gastado, primera y última visita (solo órdenes entregadas;
-- las canceladas nunca cuentan). security_invoker: la vista respeta el RLS
-- de quien consulta, así que cada taller solo ve sus clientes.

create or replace view public.clientes_resumen
with (security_invoker = true)
as
select
  c.id                          as cliente_id,
  c.taller_id,
  count(o.id)::int              as visitas,
  coalesce(sum(o.total), 0)     as total_gastado,
  min(o.fecha)                  as primera_visita,
  max(o.fecha)                  as ultima_visita
from public.clientes c
left join public.vehiculos v
  on v.cliente_id = c.id and v.taller_id = c.taller_id
left join public.ordenes_trabajo o
  on o.vehiculo_id = v.id and o.taller_id = c.taller_id and o.estado = 'entregado'
group by c.id, c.taller_id;

revoke all on public.clientes_resumen from anon;
grant select on public.clientes_resumen to authenticated;

commit;

notify pgrst, 'reload schema';


-- ════════════════════════════════════════════════════════════════════════════
-- VERIFICACIÓN (opcional, correr después por separado):
--
--   select tablename, policyname, cmd from pg_policies
--     where tablename in ('interacciones', 'seguimientos', 'vencimientos_vehiculo')
--     order by tablename, cmd;
--   select * from public.clientes_resumen limit 5;
-- ════════════════════════════════════════════════════════════════════════════
