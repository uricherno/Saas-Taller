-- ════════════════════════════════════════════════════════════════════════════
-- Cobros en la orden (seña, pagos parciales, medio de pago, saldo) y fecha de
-- terminación de cada orden (para el resumen del mes en /inicio).
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261009.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--
-- QUÉ HACE
--   pagos                    → cada cobro de una orden (seña o pago), con medio
--                              de pago y fecha.
--   ordenes_saldo (vista)    → total, cobrado y saldo de cada orden.
--   ordenes_trabajo.terminada_en → cuándo pasó a terminado/entregado. La llena
--                              la base sola. Las órdenes viejas se completan con
--                              su fecha.
--
-- PERMISOS
--   Ver cobros: todos los miembros. Registrar: dueño y recepción.
--   Borrar un cobro cargado por error: solo el dueño.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Pagos ───────────────────────────────────────────────────────────────

create table if not exists public.pagos (
  id          uuid primary key default gen_random_uuid(),
  taller_id   uuid not null references public.talleres (id) on delete cascade,
  orden_id    uuid not null,
  fecha       date not null default ((now() at time zone 'America/Argentina/Buenos_Aires')::date),
  monto       numeric(14, 2) not null check (monto > 0),
  concepto    text not null default 'pago' check (concepto in ('sena', 'pago')),
  medio       text not null check (medio in ('efectivo', 'transferencia', 'debito', 'credito', 'mercadopago', 'cheque', 'otro')),
  nota        text check (nota is null or length(nota) <= 300),
  creado_por  uuid default auth.uid(),
  creado_en   timestamptz not null default now(),

  foreign key (taller_id, orden_id) references public.ordenes_trabajo (taller_id, id) on delete cascade
);

create index if not exists pagos_orden_idx on public.pagos (taller_id, orden_id);
create index if not exists pagos_fecha_idx on public.pagos (taller_id, fecha);

alter table public.pagos enable row level security;

revoke all on public.pagos from anon;
grant select, insert, delete on public.pagos to authenticated;

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'pagos' loop
    execute format('drop policy %I on public.pagos', p.policyname);
  end loop;
end $$;

create policy "pagos: leer miembros" on public.pagos
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "pagos: registrar dueño y recepción" on public.pagos
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion')
              and creado_por = (select auth.uid()));

create policy "pagos: borrar dueño" on public.pagos
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) = 'dueno');


-- ─── 2. Saldo de cada orden ─────────────────────────────────────────────────
-- security_invoker: respeta el RLS de quien consulta (cada taller ve lo suyo).

create or replace view public.ordenes_saldo
with (security_invoker = true)
as
select
  o.id                                         as orden_id,
  o.taller_id,
  o.estado,
  coalesce(o.total, 0)                         as total,
  coalesce(sum(p.monto), 0)                    as cobrado,
  coalesce(o.total, 0) - coalesce(sum(p.monto), 0) as saldo
from public.ordenes_trabajo o
left join public.pagos p on p.orden_id = o.id and p.taller_id = o.taller_id
group by o.id, o.taller_id, o.estado, o.total;

revoke all on public.ordenes_saldo from anon;
grant select on public.ordenes_saldo to authenticated;


-- ─── 3. Fecha de terminación ────────────────────────────────────────────────

alter table public.ordenes_trabajo
  add column if not exists terminada_en timestamptz;

-- Órdenes que ya estaban cerradas: se toma la fecha de la orden.
update public.ordenes_trabajo
set terminada_en = fecha::timestamp at time zone 'America/Argentina/Buenos_Aires'
where terminada_en is null and estado in ('terminado', 'entregado');

create index if not exists ordenes_terminada_idx on public.ordenes_trabajo (taller_id, terminada_en);

create or replace function public.marcar_orden_terminada()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.estado in ('terminado', 'entregado') then
    -- Al pasar de terminado a entregado se conserva la fecha original.
    if new.terminada_en is null or (tg_op = 'UPDATE' and old.estado not in ('terminado', 'entregado')) then
      new.terminada_en := now();
    end if;
  else
    -- Reabierta o cancelada: deja de contar como terminada.
    new.terminada_en := null;
  end if;
  return new;
end;
$$;

drop trigger if exists ordenes_terminada on public.ordenes_trabajo;
create trigger ordenes_terminada
  before insert or update of estado on public.ordenes_trabajo
  for each row execute function public.marcar_orden_terminada();

commit;

notify pgrst, 'reload schema';
