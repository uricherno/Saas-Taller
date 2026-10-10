-- ════════════════════════════════════════════════════════════════════════════
-- Crea un usuario de RECEPCIÓN y uno de MECÁNICO en el taller de un dueño, sin
-- mandar mails (quedan con el email ya confirmado y pueden entrar directo).
--
-- CÓMO USARLO
--   1. Cambiá los datos de la sección "DATOS" (el email del dueño tiene que ser
--      el de una cuenta que ya existe; los otros pueden ser inventados, por
--      ejemplo recepcion@mitaller.test).
--   2. Supabase → SQL Editor → New query → pegar TODO → Run.
--   3. Entrar a la app con esos emails y la contraseña de abajo.
--
-- Si un email ya existe, lo saltea y avisa. No toca nada más.
-- Usa el mismo camino que una invitación desde /equipo: el usuario queda en el
-- taller del dueño con el rol elegido.
-- ════════════════════════════════════════════════════════════════════════════

do $$
declare
  -- ─── DATOS ─────────────────────────────────────────────────────────────────
  v_email_dueno     text := 'TU_MAIL_DE_DUENO@gmail.com';
  v_clave           text := 'Prueba1234';
  v_empleados       jsonb := '[
    {"email": "recepcion@mitaller.test", "nombre": "Recepción Prueba", "rol": "recepcion"},
    {"email": "mecanico@mitaller.test",  "nombre": "Mecánico Prueba",  "rol": "mecanico"}
  ]';
  -- ───────────────────────────────────────────────────────────────────────────
  v_dueno   uuid;
  v_taller  uuid;
  v_emp     jsonb;
  v_email   text;
  v_id      uuid;
  v_token   text;
begin
  select u.id, u.taller_id into v_dueno, v_taller
  from public.usuarios u
  join auth.users a on a.id = u.id
  where lower(a.email) = lower(trim(v_email_dueno)) and u.rol = 'dueno';

  perform set_config('empleados.dueno', v_email_dueno, false); -- para la consulta de abajo

  if v_dueno is null then
    raise exception 'No hay un dueño con el email %. Revisá el email en la sección DATOS.', v_email_dueno;
  end if;

  for v_emp in select * from jsonb_array_elements(v_empleados) loop
    v_email := lower(trim(v_emp->>'email'));

    if exists (select 1 from auth.users where lower(email) = v_email) then
      raise notice 'Ya existe un usuario con el email %: no se creó.', v_email;
      continue;
    end if;

    -- Invitación (como si el dueño la hubiera creado en /equipo).
    insert into public.invitaciones (taller_id, email, rol, creada_por)
    values (v_taller, v_email, v_emp->>'rol', v_dueno)
    returning token into v_token;

    -- Usuario con email confirmado y contraseña. El trigger handle_new_user lo
    -- suma al taller con el rol de la invitación.
    v_id := gen_random_uuid();
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    ) values (
      v_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', v_email,
      extensions.crypt(v_clave, extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('nombre', v_emp->>'nombre', 'invitacion', v_token,
                         'terminos_aceptados_en', now()),
      now(), now(), '', '', '', ''
    );

    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
            'email', now(), now(), now());

    raise notice 'Creado: % (%) con contraseña %', v_email, v_emp->>'rol', v_clave;
  end loop;
end $$;

-- Para ver cómo quedó el equipo del taller:
select a.email, u.nombre, u.rol, u.activo
from public.usuarios u
join auth.users a on a.id = u.id
where u.taller_id = (
  select u2.taller_id from public.usuarios u2 join auth.users a2 on a2.id = u2.id
  where lower(a2.email) = lower(current_setting('empleados.dueno'))
)
order by u.rol, a.email;
