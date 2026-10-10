-- ════════════════════════════════════════════════════════════════════════════
-- El dueño crea usuarios de su equipo con contraseña, desde /equipo, sin que
-- haga falta mandar ningún mail (no depende del límite de mails de Supabase).
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261015.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Se puede correr más de una vez. No borra ni cambia datos.
--
-- QUÉ HACE
--   crear_empleado(email, nombre, rol, clave) → solo la puede usar un dueño
--   activo. Crea la invitación y el usuario (con el email ya confirmado), por el
--   mismo camino que una invitación normal: el trigger handle_new_user lo suma
--   al taller del dueño con ese rol.
--   Devuelve 'ok', o el motivo: 'sin_permiso', 'datos', 'existe'.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.crear_empleado(p_email text, p_nombre text, p_rol text, p_clave text)
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_taller uuid := public.mi_taller_id();
  v_email  text := lower(trim(coalesce(p_email, '')));
  v_nombre text := trim(coalesce(p_nombre, ''));
  v_token  text;
  v_id     uuid := gen_random_uuid();
begin
  if v_taller is null or public.mi_rol() is distinct from 'dueno' then
    return 'sin_permiso';
  end if;

  if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(v_email) > 200
     or length(v_nombre) not between 1 and 200
     or p_rol not in ('recepcion', 'mecanico', 'dueno')
     or length(coalesce(p_clave, '')) not between 8 and 72 then
    return 'datos';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    return 'existe';
  end if;

  insert into public.invitaciones (taller_id, email, rol, creada_por)
  values (v_taller, v_email, p_rol, auth.uid())
  returning token into v_token;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_clave, extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('nombre', v_nombre, 'invitacion', v_token, 'terminos_aceptados_en', now()),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
          'email', now(), now(), now());

  return 'ok';
end;
$$;

revoke execute on function public.crear_empleado(text, text, text, text) from public, anon;
grant execute on function public.crear_empleado(text, text, text, text) to authenticated;

commit;

notify pgrst, 'reload schema';
