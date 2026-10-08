-- ════════════════════════════════════════════════════════════════════════════
-- Hoja de ruta 1: tablas de turnos y encuestas de satisfacción.
-- (Solo la base: las pantallas se hacen después.)
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261012.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--
-- QUÉ HACE
--   turnos     → agenda del taller. Puede ser de un cliente ya cargado o de
--                alguien nuevo (nombre y teléfono sueltos). Cuando llega el
--                auto, se vincula con la orden.
--   encuestas  → una por orden, con código secreto para el link que se le
--                manda al cliente. Puntaje de 0 a 10 (tipo NPS) y comentario.
--   encuesta_publica(c) / responder_encuesta(c, puntaje, comentario)
--              → para el cliente sin sesión (igual que el link de la orden).
--
-- PERMISOS
--   Leer: todos los miembros. Crear y editar: dueño y recepción. Borrar: dueño.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Turnos ──────────────────────────────────────────────────────────────

create table if not exists public.turnos (
  id               uuid primary key default gen_random_uuid(),
  taller_id        uuid not null references public.talleres (id) on delete cascade,
  cliente_id       uuid,
  vehiculo_id      uuid,
  orden_id         uuid,
  -- Para turnos de gente que todavía no es cliente.
  nombre_contacto  text check (nombre_contacto is null or length(trim(nombre_contacto)) between 1 and 200),
  telefono         text check (telefono is null or length(telefono) <= 40),
  patente          text check (patente is null or length(patente) <= 15),
  inicio           timestamptz not null,
  duracion_min     int not null default 60 check (duracion_min between 5 and 1440),
  motivo           text check (motivo is null or length(motivo) <= 500),
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente', 'confirmado', 'atendido', 'no_vino', 'cancelado')),
  recordado_en     timestamptz,  -- cuándo se le recordó el turno por WhatsApp
  creado_por       uuid default auth.uid(),
  creado_en        timestamptz not null default now(),

  constraint turnos_contacto_check check (cliente_id is not null or nombre_contacto is not null),
  foreign key (taller_id, cliente_id)  references public.clientes        (taller_id, id) on delete set null (cliente_id),
  foreign key (taller_id, vehiculo_id) references public.vehiculos       (taller_id, id) on delete set null (vehiculo_id),
  foreign key (taller_id, orden_id)    references public.ordenes_trabajo (taller_id, id) on delete set null (orden_id),
  foreign key (taller_id, creado_por)  references public.usuarios        (taller_id, id) on delete set null (creado_por)
);

create index if not exists turnos_agenda_idx on public.turnos (taller_id, inicio);


-- ─── 2. Encuestas ───────────────────────────────────────────────────────────

create table if not exists public.encuestas (
  id             uuid primary key default gen_random_uuid(),
  taller_id      uuid not null references public.talleres (id) on delete cascade,
  orden_id       uuid not null,
  codigo         text not null unique
                 default replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''),
  enviada_en     timestamptz,
  respondida_en  timestamptz,
  puntaje        int check (puntaje between 0 and 10),
  comentario     text check (comentario is null or length(comentario) <= 2000),
  creado_en      timestamptz not null default now(),

  constraint encuestas_orden_key unique (orden_id),
  constraint encuestas_respuesta_check check ((respondida_en is null) = (puntaje is null)),
  foreign key (taller_id, orden_id) references public.ordenes_trabajo (taller_id, id) on delete cascade
);

create index if not exists encuestas_taller_idx on public.encuestas (taller_id, respondida_en);


-- ─── 3. Permisos ────────────────────────────────────────────────────────────

alter table public.turnos    enable row level security;
alter table public.encuestas enable row level security;

revoke all on public.turnos, public.encuestas from anon;
grant select, insert, update, delete on public.turnos, public.encuestas to authenticated;

do $$
declare
  p record;
begin
  for p in
    select policyname, tablename from pg_policies
    where schemaname = 'public' and tablename in ('turnos', 'encuestas')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

do $$
declare
  t text;
begin
  foreach t in array array['turnos', 'encuestas'] loop
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


-- ─── 4. Encuesta pública ────────────────────────────────────────────────────

create or replace function public.encuesta_publica(p_codigo text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'taller', t.nombre,
    'patente', v.patente,
    'fecha', o.fecha,
    'respondida', e.respondida_en is not null
  )
  from public.encuestas e
  join public.ordenes_trabajo o on o.id = e.orden_id and o.taller_id = e.taller_id
  join public.talleres t on t.id = e.taller_id
  left join public.vehiculos v on v.id = o.vehiculo_id and v.taller_id = o.taller_id
  where p_codigo ~ '^[0-9a-f]{64}$' and e.codigo = p_codigo
$$;

-- Se responde una sola vez. Devuelve true si quedó guardada.
create or replace function public.responder_encuesta(p_codigo text, p_puntaje int, p_comentario text)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if p_codigo is null or p_codigo !~ '^[0-9a-f]{64}$' or p_puntaje is null or p_puntaje not between 0 and 10 then
    return false;
  end if;

  update public.encuestas
  set puntaje = p_puntaje,
      comentario = nullif(left(trim(coalesce(p_comentario, '')), 2000), ''),
      respondida_en = now()
  where codigo = p_codigo and respondida_en is null;

  return found;
end;
$$;

revoke execute on function public.encuesta_publica(text) from public;
revoke execute on function public.responder_encuesta(text, int, text) from public;
grant execute on function public.encuesta_publica(text) to anon, authenticated;
grant execute on function public.responder_encuesta(text, int, text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';
