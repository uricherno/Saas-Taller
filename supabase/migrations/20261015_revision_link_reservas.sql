-- ════════════════════════════════════════════════════════════════════════════
-- 1. Estado "en_revision" (el auto está siendo examinado).
-- 2. El link del cliente muestra los pagos (seña / pago) y las fotos.
-- 3. Reservas online: página pública para que el cliente saque turno solo.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261014.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--
-- SEGURIDAD
--   Todo lo que usa alguien sin cuenta pasa por funciones security definer
--   que validan el código secreto (del link o de reservas). RLS no se toca.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Estado "en_revision" ────────────────────────────────────────────────

alter table public.ordenes_trabajo drop constraint if exists ordenes_trabajo_estado_check;
alter table public.ordenes_trabajo
  add constraint ordenes_trabajo_estado_check
  check (estado in ('en_revision', 'presupuestado', 'en_proceso', 'terminado', 'entregado', 'cancelado'));


-- ─── 2. Link del cliente: pagos y fotos ─────────────────────────────────────

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
    'pagos', coalesce((
      select jsonb_agg(jsonb_build_object('fecha', p.fecha, 'monto', p.monto, 'concepto', p.concepto, 'medio', p.medio)
             order by p.fecha, p.creado_en)
      from public.pagos p
      where p.orden_id = o.id and p.taller_id = o.taller_id
    ), '[]'::jsonb),
    'fotos', coalesce((
      select jsonb_agg(jsonb_build_object('ruta', f.ruta, 'tipo', f.tipo, 'nota', f.nota) order by f.creado_en)
      from public.fotos_orden f
      where f.orden_id = o.id and f.taller_id = o.taller_id
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

revoke execute on function public.orden_publica(text) from public;
grant execute on function public.orden_publica(text) to anon, authenticated;

-- ¿Esta foto es de una orden que tiene link para el cliente?
-- (Lo usa la política del bucket para que el link pueda mostrarla.)
create or replace function public.foto_con_link_publico(p_ruta text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.fotos_orden f
    join public.ordenes_links l on l.orden_id = f.orden_id and l.taller_id = f.taller_id
    where f.ruta = p_ruta
  )
$$;

revoke execute on function public.foto_con_link_publico(text) from public;
grant execute on function public.foto_con_link_publico(text) to anon, authenticated;

-- Sin sesión solo se pueden leer fotos de órdenes con link. La ruta tiene dos
-- UUID y un nombre aleatorio: solo la conoce quien tiene el link.
drop policy if exists "fotos-ordenes: leer con link" on storage.objects;
create policy "fotos-ordenes: leer con link" on storage.objects
  for select to anon
  using (bucket_id = 'fotos-ordenes' and (select public.foto_con_link_publico(name)));


-- ─── 3. Reservas online ─────────────────────────────────────────────────────

alter table public.talleres
  add column if not exists reservas_activas boolean not null default false,
  add column if not exists reservas_codigo  text,
  add column if not exists horario          jsonb not null
    default '{"dias": [1, 2, 3, 4, 5], "desde": "08:00", "hasta": "17:00", "duracion": 60}'::jsonb;

update public.talleres
set reservas_codigo = substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)
where reservas_codigo is null;

alter table public.talleres alter column reservas_codigo set default substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
alter table public.talleres alter column reservas_codigo set not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'talleres_reservas_codigo_key') then
    alter table public.talleres add constraint talleres_reservas_codigo_key unique (reservas_codigo);
  end if;
end $$;

alter table public.turnos
  add column if not exists origen text not null default 'taller';
alter table public.turnos drop constraint if exists turnos_origen_check;
alter table public.turnos add constraint turnos_origen_check check (origen in ('taller', 'online'));

-- Datos para la página pública: taller, horario y turnos ocupados (sin datos personales).
create or replace function public.reservas_info(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'taller', t.nombre,
    'telefono', t.telefono,
    'horario', t.horario,
    'ocupados', coalesce((
      select jsonb_agg(tu.inicio order by tu.inicio)
      from public.turnos tu
      where tu.taller_id = t.id
        and tu.estado <> 'cancelado'
        and tu.inicio >= now()
        and tu.inicio < now() + interval '31 days'
    ), '[]'::jsonb)
  )
  from public.talleres t
  where p_codigo ~ '^[0-9a-f]{12}$'
    and t.reservas_codigo = p_codigo
    and t.reservas_activas
    and t.suspendido_en is null
$$;

-- Reserva un turno. Devuelve 'ok' o el motivo del rechazo:
-- 'no_disponible' (link inválido), 'datos' (faltan datos), 'fuera_de_horario', 'ocupado', 'limite'.
create or replace function public.reservar_turno(
  p_codigo text, p_inicio timestamptz, p_nombre text, p_telefono text, p_patente text, p_motivo text
)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_taller   public.talleres%rowtype;
  v_local    timestamp := p_inicio at time zone 'America/Argentina/Buenos_Aires';
  v_dur      int;
  v_desde    time;
  v_hasta    time;
  v_minutos  int;
  v_tel      text := regexp_replace(coalesce(p_telefono, ''), '\D', '', 'g');
begin
  if p_codigo is null or p_codigo !~ '^[0-9a-f]{12}$' then
    return 'no_disponible';
  end if;
  select * into v_taller from public.talleres
  where reservas_codigo = p_codigo and reservas_activas and suspendido_en is null;
  if not found then
    return 'no_disponible';
  end if;

  if p_inicio is null or length(trim(coalesce(p_nombre, ''))) not between 1 and 200
     or length(v_tel) not between 8 and 15
     or length(coalesce(p_patente, '')) > 15 or length(coalesce(p_motivo, '')) > 500 then
    return 'datos';
  end if;

  -- Entre 1 hora y 30 días desde ahora, un día y horario de atención, alineado a la grilla.
  v_dur   := coalesce((v_taller.horario->>'duracion')::int, 60);
  v_desde := coalesce((v_taller.horario->>'desde')::time, '08:00');
  v_hasta := coalesce((v_taller.horario->>'hasta')::time, '17:00');
  v_minutos := extract(epoch from (v_local::time - v_desde))::int / 60;
  if p_inicio < now() + interval '1 hour' or p_inicio > now() + interval '30 days'
     or not (v_taller.horario->'dias') @> to_jsonb(extract(isodow from v_local)::int)
     or v_local::time < v_desde
     or v_local::time + make_interval(mins => v_dur) > v_hasta
     or v_minutos % v_dur <> 0
     or extract(second from v_local) <> 0 then
    return 'fuera_de_horario';
  end if;

  -- Un turno por horario (se bloquea el taller para que dos reservas no choquen).
  perform 1 from public.talleres where id = v_taller.id for update;
  if exists (select 1 from public.turnos
             where taller_id = v_taller.id and inicio = p_inicio and estado <> 'cancelado') then
    return 'ocupado';
  end if;

  -- Hasta 2 turnos online pendientes por teléfono (evita reservas en masa).
  if (select count(*) from public.turnos
      where taller_id = v_taller.id and origen = 'online' and inicio >= now()
        and estado in ('pendiente', 'confirmado')
        -- Últimos 10 dígitos: "011 15…", "+54 9 11…" y "11…" cuentan como el mismo número.
        and right(regexp_replace(coalesce(telefono, ''), '\D', '', 'g'), 10) = right(v_tel, 10)) >= 2 then
    return 'limite';
  end if;

  insert into public.turnos (taller_id, nombre_contacto, telefono, patente, inicio, duracion_min, motivo, origen, creado_por)
  values (v_taller.id, trim(p_nombre), trim(p_telefono), nullif(upper(regexp_replace(coalesce(p_patente, ''), '[^A-Za-z0-9]', '', 'g')), ''),
          p_inicio, v_dur, nullif(trim(coalesce(p_motivo, '')), ''), 'online', null);

  return 'ok';
end;
$$;

revoke execute on function public.reservas_info(text) from public;
revoke execute on function public.reservar_turno(text, timestamptz, text, text, text, text) from public;
grant execute on function public.reservas_info(text) to anon, authenticated;
grant execute on function public.reservar_turno(text, timestamptz, text, text, text, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
