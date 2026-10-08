-- ════════════════════════════════════════════════════════════════════════════
-- Link público de la orden: el cliente ve su presupuesto/orden sin cuenta y
-- puede aceptar el presupuesto.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261008.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--
-- QUÉ HACE
--   ordenes_links        → un código secreto (64 caracteres) por orden.
--   orden_publica(c)     → para el visitante sin sesión: devuelve SOLO esa
--                          orden (taller, vehículo, nombre del cliente, items,
--                          totales). Nunca datos de otros talleres ni el
--                          teléfono del cliente.
--   aceptar_presupuesto  → registra cuándo el cliente aceptó (y el total en ese
--                          momento) y deja una interacción en la línea de tiempo.
--
-- PERMISOS
--   Ver los links: todos los miembros. Crear y anular: dueño y recepción
--   (los que pueden contactar al cliente). El visitante solo usa las dos
--   funciones, nunca la tabla.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create table if not exists public.ordenes_links (
  id              uuid primary key default gen_random_uuid(),
  taller_id       uuid not null references public.talleres (id) on delete cascade,
  orden_id        uuid not null,
  -- 64 caracteres hexadecimales aleatorios (dos UUID v4 sin guiones), igual que las invitaciones.
  codigo          text not null unique
                  default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  creado_por      uuid default auth.uid(),
  creado_en       timestamptz not null default now(),
  visto_en        timestamptz,   -- última vez que el cliente lo abrió
  aceptado_en     timestamptz,   -- cuándo aceptó el presupuesto
  total_aceptado  numeric(14, 2),

  constraint ordenes_links_orden_key unique (orden_id),
  foreign key (taller_id, orden_id) references public.ordenes_trabajo (taller_id, id) on delete cascade
);

alter table public.ordenes_links enable row level security;

revoke all on public.ordenes_links from anon;
grant select, insert, delete on public.ordenes_links to authenticated;

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'ordenes_links' loop
    execute format('drop policy %I on public.ordenes_links', p.policyname);
  end loop;
end $$;

create policy "ordenes_links: leer miembros" on public.ordenes_links
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "ordenes_links: crear dueño y recepción" on public.ordenes_links
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion')
              and aceptado_en is null);

create policy "ordenes_links: anular dueño y recepción" on public.ordenes_links
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id()) and (select public.mi_rol()) in ('dueno', 'recepcion'));


-- ─── Consulta pública ───────────────────────────────────────────────────────
-- security definer: el visitante no tiene sesión y no puede leer ninguna tabla.
-- Busca por el código exacto y devuelve un JSON armado a mano con lo justo.
-- (volatile porque marca visto_en.)

create or replace function public.orden_publica(p_codigo text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_link public.ordenes_links%rowtype;
  v_res  jsonb;
begin
  if p_codigo is null or p_codigo !~ '^[0-9a-f]{64}$' then
    return null;
  end if;

  select * into v_link from public.ordenes_links l where l.codigo = p_codigo;
  if not found then
    return null;
  end if;

  -- Solo cuenta como "visto" si lo abre alguien sin sesión (no el propio taller revisándolo).
  if (select auth.uid()) is null then
    update public.ordenes_links set visto_en = now() where id = v_link.id;
  end if;

  select jsonb_build_object(
    'taller', jsonb_build_object('nombre', t.nombre, 'telefono', t.telefono),
    'orden', jsonb_build_object(
      'fecha', o.fecha,
      'estado', o.estado,
      'tipo_trabajo', o.tipo_trabajo,
      'descripcion', o.descripcion,
      'km_ingreso', o.km_ingreso,
      'total', o.total,
      'proximo_service_fecha', o.proximo_service_fecha,
      'proximo_service_km', o.proximo_service_km
    ),
    'vehiculo', jsonb_build_object('patente', v.patente, 'marca', v.marca, 'modelo', v.modelo, 'anio', v.anio),
    'cliente', c.nombre,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
               'tipo', i.tipo, 'descripcion', i.descripcion,
               'cantidad', i.cantidad, 'precio_unitario', i.precio_unitario)
             order by i.tipo desc, i.descripcion)
      from public.items_orden i
      where i.orden_id = o.id and i.taller_id = o.taller_id
    ), '[]'::jsonb),
    'aceptado_en', v_link.aceptado_en,
    'total_aceptado', v_link.total_aceptado
  )
  into v_res
  from public.ordenes_trabajo o
  join public.talleres t on t.id = o.taller_id
  left join public.vehiculos v on v.id = o.vehiculo_id and v.taller_id = o.taller_id
  left join public.clientes c on c.id = v.cliente_id and c.taller_id = o.taller_id
  where o.id = v_link.orden_id and o.taller_id = v_link.taller_id;

  return v_res;
end;
$$;

-- El cliente acepta el presupuesto. Solo si la orden sigue "presupuestado" y
-- todavía no se aceptó. Devuelve true si quedó registrado.
create or replace function public.aceptar_presupuesto(p_codigo text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_link    public.ordenes_links%rowtype;
  v_orden   record;
begin
  if p_codigo is null or p_codigo !~ '^[0-9a-f]{64}$' then
    return false;
  end if;

  select * into v_link from public.ordenes_links l where l.codigo = p_codigo for update;
  if not found or v_link.aceptado_en is not null then
    return false;
  end if;

  select o.id, o.taller_id, o.estado, o.total, o.vehiculo_id, v.cliente_id
  into v_orden
  from public.ordenes_trabajo o
  left join public.vehiculos v on v.id = o.vehiculo_id and v.taller_id = o.taller_id
  where o.id = v_link.orden_id and o.taller_id = v_link.taller_id;

  if not found or v_orden.estado <> 'presupuestado' then
    return false;
  end if;

  update public.ordenes_links
  set aceptado_en = now(), total_aceptado = v_orden.total
  where id = v_link.id;

  -- Queda en la línea de tiempo del cliente (sin autor: lo hizo el cliente).
  if v_orden.cliente_id is not null then
    insert into public.interacciones (taller_id, cliente_id, vehiculo_id, tipo, texto, creado_por)
    values (
      v_orden.taller_id, v_orden.cliente_id, v_orden.vehiculo_id, 'presupuesto',
      'El cliente aceptó el presupuesto desde el link (total $ '
        || to_char(coalesce(v_orden.total, 0), 'FM999G999G999G990D00') || ').',
      null
    );
  end if;

  return true;
end;
$$;

revoke execute on function public.orden_publica(text) from public;
revoke execute on function public.aceptar_presupuesto(text) from public;
grant execute on function public.orden_publica(text) to anon, authenticated;
grant execute on function public.aceptar_presupuesto(text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
