-- ════════════════════════════════════════════════════════════════════════════
-- Panel de administración del SaaS: lista de talleres, actividad, y
-- suspender / reactivar un taller.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261013.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--   4. Hacerte admin (una sola vez, con TU email):
--        insert into public.admins_saas (user_id)
--        select id from auth.users where email = 'tu@email.com';
--
-- QUÉ HACE
--   admins_saas        → quiénes son administradores del SaaS. Nadie la puede
--                        leer ni escribir desde la app (solo desde el panel de
--                        Supabase).
--   talleres.suspendido_en / suspendido_motivo
--   mi_taller_id() y mi_rol() → ahora devuelven NULL si el taller está
--                        suspendido: todas las políticas RLS dejan de dejar
--                        ver o tocar nada, sin cambiar ninguna política.
--   estado_cuenta()    → 'ok' | 'desactivado' | 'suspendido' (para avisarle al
--                        usuario por qué no puede entrar).
--   admin_talleres(), admin_suspender_taller(), admin_reactivar_taller()
--                      → solo funcionan si quien llama está en admins_saas.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Administradores ─────────────────────────────────────────────────────

create table if not exists public.admins_saas (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  creado_en  timestamptz not null default now()
);

alter table public.admins_saas enable row level security;
revoke all on public.admins_saas from anon, authenticated;
-- Sin políticas: desde la API no se lee ni se escribe.

create or replace function public.soy_admin_saas()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins_saas a where a.user_id = (select auth.uid()))
$$;

revoke execute on function public.soy_admin_saas() from public, anon;
grant execute on function public.soy_admin_saas() to authenticated;


-- ─── 2. Suspensión ──────────────────────────────────────────────────────────

alter table public.talleres
  add column if not exists suspendido_en     timestamptz,
  add column if not exists suspendido_motivo text check (suspendido_motivo is null or length(suspendido_motivo) <= 500);

-- El dueño puede editar su taller, pero no estas dos columnas.
create or replace function public.talleres_proteger_suspension()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.suspendido_en is distinct from old.suspendido_en
      or new.suspendido_motivo is distinct from old.suspendido_motivo)
     and (select auth.uid()) is not null
     and not (select public.soy_admin_saas()) then
    raise exception 'No se puede cambiar la suspensión del taller.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists talleres_proteger_suspension on public.talleres;
create trigger talleres_proteger_suspension
  before update on public.talleres
  for each row execute function public.talleres_proteger_suspension();

-- Mismas funciones que en 20261006, ahora también miran el taller.
create or replace function public.mi_taller_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.taller_id
  from public.usuarios u
  join public.talleres t on t.id = u.taller_id
  where u.id = (select auth.uid()) and u.activo and t.suspendido_en is null
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
  join public.talleres t on t.id = u.taller_id
  where u.id = (select auth.uid()) and u.activo and t.suspendido_en is null
$$;

create or replace function public.estado_cuenta()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
           when t.suspendido_en is not null then 'suspendido'
           when not u.activo then 'desactivado'
           else 'ok'
         end
  from public.usuarios u
  join public.talleres t on t.id = u.taller_id
  where u.id = (select auth.uid())
$$;

revoke execute on function public.estado_cuenta() from public, anon;
grant execute on function public.estado_cuenta() to authenticated;


-- ─── 3. Funciones del panel ─────────────────────────────────────────────────

create or replace function public.admin_talleres()
returns table (
  id                 uuid,
  nombre             text,
  telefono           text,
  creado_en          timestamptz,
  suspendido_en      timestamptz,
  suspendido_motivo  text,
  duenos             text,
  usuarios           int,
  clientes           int,
  ordenes            int,
  ordenes_30d        int,
  facturado_30d      numeric,
  ultima_orden       timestamptz,
  ultimo_ingreso     timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.soy_admin_saas()) then
    raise exception 'Solo para administradores.' using errcode = '42501';
  end if;

  return query
  select
    t.id,
    t.nombre::text,
    t.telefono::text,
    (select min(au.created_at) from public.usuarios u join auth.users au on au.id = u.id where u.taller_id = t.id),
    t.suspendido_en,
    t.suspendido_motivo,
    (select string_agg(u.email, ', ' order by u.email) from public.usuarios u
      where u.taller_id = t.id and u.rol = 'dueno')::text,
    (select count(*)::int from public.usuarios u where u.taller_id = t.id and u.activo),
    (select count(*)::int from public.clientes c where c.taller_id = t.id),
    (select count(*)::int from public.ordenes_trabajo o where o.taller_id = t.id),
    (select count(*)::int from public.ordenes_trabajo o where o.taller_id = t.id and o.creado_en > now() - interval '30 days'),
    (select coalesce(sum(o.total), 0) from public.ordenes_trabajo o
      where o.taller_id = t.id and o.terminada_en > now() - interval '30 days'),
    (select max(o.creado_en) from public.ordenes_trabajo o where o.taller_id = t.id),
    (select max(au.last_sign_in_at) from public.usuarios u join auth.users au on au.id = u.id where u.taller_id = t.id)
  from public.talleres t
  order by t.nombre;
end;
$$;

create or replace function public.admin_suspender_taller(p_taller_id uuid, p_motivo text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not (select public.soy_admin_saas()) then
    raise exception 'Solo para administradores.' using errcode = '42501';
  end if;
  update public.talleres
  set suspendido_en = now(),
      suspendido_motivo = nullif(left(trim(coalesce(p_motivo, '')), 500), '')
  where id = p_taller_id;
end;
$$;

create or replace function public.admin_reactivar_taller(p_taller_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if not (select public.soy_admin_saas()) then
    raise exception 'Solo para administradores.' using errcode = '42501';
  end if;
  update public.talleres set suspendido_en = null, suspendido_motivo = null where id = p_taller_id;
end;
$$;

revoke execute on function public.admin_talleres() from public, anon;
revoke execute on function public.admin_suspender_taller(uuid, text) from public, anon;
revoke execute on function public.admin_reactivar_taller(uuid) from public, anon;
grant execute on function public.admin_talleres() to authenticated;
grant execute on function public.admin_suspender_taller(uuid, text) to authenticated;
grant execute on function public.admin_reactivar_taller(uuid) to authenticated;

commit;

notify pgrst, 'reload schema';
