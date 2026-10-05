-- ════════════════════════════════════════════════════════════════════════════
-- Lista de precios del taller, con historial, y vínculo con los items de las órdenes.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261005, 20261006 y 20261007.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--      (Si aparece "Potential issue detected", es porque borra y recrea las
--       políticas de estas tablas nuevas. No borra datos.)
--   3. Corre en una transacción: si algo falla, no se aplica nada.
--      Se puede correr más de una vez.
--
-- QUÉ HACE
--   precios              → la lista vigente (un código por ítem y por taller).
--   precios_historial    → cada vez que cambia un precio queda una fila con el
--                          precio nuevo y la fecha (la llena la base, sola).
--   precios_cargas       → registro de cada archivo subido (cuándo, quién,
--                          cuántos ítems nuevos y actualizados).
--   items_orden          → precio_id y codigo: de qué ítem de la lista salió
--                          cada línea. El precio de la línea NO cambia solo si
--                          después cambia la lista (el presupuesto ya enviado
--                          se mantiene).
--
-- PERMISOS
--   Leer la lista y su historial: todos los miembros (para armar presupuestos).
--   Crear, editar, borrar ítems y subir archivos: solo el dueño.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Lista de precios ────────────────────────────────────────────────────

create table if not exists public.precios (
  id             uuid primary key default gen_random_uuid(),
  taller_id      uuid not null references public.talleres (id) on delete cascade,
  codigo         text not null check (length(trim(codigo)) between 1 and 60),
  descripcion    text not null check (length(trim(descripcion)) between 1 and 300),
  tipo           text not null default 'repuesto' check (tipo in ('repuesto', 'mano_de_obra')),
  precio         numeric(14, 2) not null check (precio >= 0),
  activo         boolean not null default true,
  actualizado_en timestamptz not null default now(),
  creado_en      timestamptz not null default now(),

  constraint precios_taller_codigo_key unique (taller_id, codigo),
  constraint precios_taller_id_id_key unique (taller_id, id)
);

create index if not exists precios_busqueda_idx on public.precios (taller_id, activo, descripcion);


-- ─── 2. Historial de precios ────────────────────────────────────────────────

create table if not exists public.precios_historial (
  id           uuid primary key default gen_random_uuid(),
  taller_id    uuid not null,
  precio_id    uuid not null,
  precio       numeric(14, 2) not null,
  desde        timestamptz not null default now(),
  cambiado_por uuid,

  foreign key (taller_id, precio_id) references public.precios (taller_id, id) on delete cascade
);

create index if not exists precios_historial_idx on public.precios_historial (precio_id, desde desc);

-- Cada alta o cambio de precio queda registrado, venga del archivo o de una edición a mano.
create or replace function public.registrar_cambio_precio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.precio is distinct from old.precio then
    insert into public.precios_historial (taller_id, precio_id, precio, cambiado_por)
    values (new.taller_id, new.id, new.precio, (select auth.uid()));
  end if;
  return new;
end;
$$;

create or replace function public.marcar_precio_actualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.precio is distinct from old.precio
     or new.descripcion is distinct from old.descripcion
     or new.tipo is distinct from old.tipo
     or new.activo is distinct from old.activo then
    new.actualizado_en := now();
  else
    new.actualizado_en := old.actualizado_en;
  end if;
  return new;
end;
$$;

drop trigger if exists precios_historial_trg on public.precios;
create trigger precios_historial_trg
  after insert or update of precio on public.precios
  for each row execute function public.registrar_cambio_precio();

drop trigger if exists precios_actualizado_trg on public.precios;
create trigger precios_actualizado_trg
  before update on public.precios
  for each row execute function public.marcar_precio_actualizado();


-- ─── 3. Registro de archivos subidos ────────────────────────────────────────

create table if not exists public.precios_cargas (
  id            uuid primary key default gen_random_uuid(),
  taller_id     uuid not null references public.talleres (id) on delete cascade,
  archivo       text not null check (length(archivo) <= 255),
  nuevos        int not null default 0,
  actualizados  int not null default 0,
  sin_cambios   int not null default 0,
  desactivados  int not null default 0,
  creado_por    uuid default auth.uid(),
  creado_en     timestamptz not null default now()
);

create index if not exists precios_cargas_idx on public.precios_cargas (taller_id, creado_en desc);


-- ─── 4. Items de orden vinculados a la lista ────────────────────────────────

alter table public.items_orden
  add column if not exists precio_id uuid,
  add column if not exists codigo text check (codigo is null or length(codigo) <= 60);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'items_orden_precio_fkey') then
    alter table public.items_orden
      add constraint items_orden_precio_fkey
      foreign key (taller_id, precio_id) references public.precios (taller_id, id)
      on delete set null (precio_id);
  end if;
end $$;


-- ─── 5. Permisos ────────────────────────────────────────────────────────────

alter table public.precios           enable row level security;
alter table public.precios_historial enable row level security;
alter table public.precios_cargas    enable row level security;

revoke all on public.precios, public.precios_historial, public.precios_cargas from anon;
grant select, insert, update, delete on public.precios to authenticated;
grant select on public.precios_historial to authenticated;  -- lo escribe solo el trigger
grant select, insert on public.precios_cargas to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('precios', 'precios_historial', 'precios_cargas')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

create policy "precios: leer miembros" on public.precios
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "precios: crear dueño" on public.precios
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

create policy "precios: editar dueño" on public.precios
  for update to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno')
  with check (taller_id = (select public.mi_taller_id()));

create policy "precios: borrar dueño" on public.precios
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');

create policy "precios_historial: leer miembros" on public.precios_historial
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "precios_cargas: leer miembros" on public.precios_cargas
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "precios_cargas: registrar dueño" on public.precios_cargas
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) = 'dueno'
              and creado_por = (select auth.uid()));

commit;

notify pgrst, 'reload schema';
