-- ════════════════════════════════════════════════════════════════════════════
-- Datos FALSOS para el Supabase de PRUEBA. ¡NUNCA correrlo en producción!
--
-- CÓMO USARLO
--   1. En el proyecto de prueba, correr antes el esquema (supabase/schema.sql)
--      y todas las migraciones en orden.
--   2. SQL Editor → pegar TODO este archivo → Run. Correrlo UNA vez.
--
-- QUÉ CREA (todas las contraseñas: Prueba1234)
--   Taller A "Taller El Pistón":  dueno.a@prueba.test, recepcion.a@prueba.test,
--                                 mecanico.a@prueba.test
--   Taller B "Lubricentro Sur":   dueno.b@prueba.test
--   Clientes, vehículos, órdenes en todos los estados, items, lista de precios
--   con stock, cobros, un link público y un turno.
--
-- Los usuarios se crean insertando en auth.users: así corre el trigger
-- handle_new_user de verdad (el taller se crea solo; los empleados entran
-- con invitación). Si el seed falla en la creación de usuarios, es el mismo
-- error que ve la gente al registrarse.
--
-- Los IDs de los usuarios son fijos (los usa supabase/tests/aislamiento_y_roles.sql).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- Crea un usuario de Auth con email confirmado y contraseña.
create or replace function pg_temp.crear_usuario(p_id uuid, p_email text, p_meta jsonb)
returns void
language plpgsql
as $$
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    p_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', p_email,
    extensions.crypt('Prueba1234', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb, p_meta, now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true), 'email', now(), now(), now());
end;
$$;

do $$
declare
  v_dueno_a   constant uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  v_recep_a   constant uuid := 'aaaaaaaa-0000-4000-8000-000000000002';
  v_meca_a    constant uuid := 'aaaaaaaa-0000-4000-8000-000000000003';
  v_dueno_b   constant uuid := 'bbbbbbbb-0000-4000-8000-000000000001';
  v_taller_a  uuid;
  v_taller_b  uuid;
  v_token     text;
  v_hoy       date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
  -- clientes, vehículos, órdenes y precios del taller A
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; cb uuid;
  v1 uuid; v2 uuid; v3 uuid; v4 uuid; vb uuid;
  o1 uuid; o2 uuid; o3 uuid; o4 uuid; o5 uuid; ob uuid;
  p_filtro uuid; p_aceite uuid; p_pastillas uuid; p_mo uuid;
begin
  if exists (select 1 from auth.users where id = v_dueno_a) then
    raise exception 'El seed ya se corrió en este proyecto.';
  end if;

  -- ─── Usuarios y talleres ─────────────────────────────────────────────────
  perform pg_temp.crear_usuario(v_dueno_a, 'dueno.a@prueba.test',
    '{"nombre": "Carlos Gómez", "taller_nombre": "Taller El Pistón"}');
  perform pg_temp.crear_usuario(v_dueno_b, 'dueno.b@prueba.test',
    '{"nombre": "Laura Fernández", "taller_nombre": "Lubricentro Sur"}');

  select taller_id into v_taller_a from public.usuarios where id = v_dueno_a;
  select taller_id into v_taller_b from public.usuarios where id = v_dueno_b;
  update public.talleres set telefono = '11 4555-1234' where id = v_taller_a;

  insert into public.invitaciones (taller_id, email, rol, creada_por)
  values (v_taller_a, 'recepcion.a@prueba.test', 'recepcion', v_dueno_a) returning token into v_token;
  perform pg_temp.crear_usuario(v_recep_a, 'recepcion.a@prueba.test',
    jsonb_build_object('nombre', 'Sofía Díaz', 'invitacion', v_token));

  insert into public.invitaciones (taller_id, email, rol, creada_por)
  values (v_taller_a, 'mecanico.a@prueba.test', 'mecanico', v_dueno_a) returning token into v_token;
  perform pg_temp.crear_usuario(v_meca_a, 'mecanico.a@prueba.test',
    jsonb_build_object('nombre', 'Martín López', 'invitacion', v_token));

  -- ─── Lista de precios (con stock) ────────────────────────────────────────
  insert into public.precios (taller_id, codigo, descripcion, tipo, precio, stock, stock_minimo)
  values (v_taller_a, 'FIL-01', 'Filtro de aceite', 'repuesto', 12500, 6, 2) returning id into p_filtro;
  insert into public.precios (taller_id, codigo, descripcion, tipo, precio, stock, stock_minimo)
  values (v_taller_a, 'ACE-5W30', 'Aceite sintético 5W30 (litro)', 'repuesto', 9800, 3, 8) returning id into p_aceite;
  insert into public.precios (taller_id, codigo, descripcion, tipo, precio, stock, stock_minimo)
  values (v_taller_a, 'PAS-DEL', 'Pastillas de freno delanteras', 'repuesto', 45000, 4, 1) returning id into p_pastillas;
  insert into public.precios (taller_id, codigo, descripcion, tipo, precio)
  values (v_taller_a, 'MO-SERV', 'Mano de obra service', 'mano_de_obra', 35000) returning id into p_mo;
  insert into public.precios (taller_id, codigo, descripcion, tipo, precio)
  values (v_taller_b, 'MO-LUB', 'Cambio de aceite', 'mano_de_obra', 20000);

  -- ─── Clientes y vehículos ────────────────────────────────────────────────
  insert into public.clientes (taller_id, nombre, telefono, origen, notas)
  values (v_taller_a, 'Juan Pérez', '11 2345-6789', 'Recomendación', 'Prefiere que lo llamen a la tarde.') returning id into c1;
  insert into public.clientes (taller_id, nombre, telefono, origen)
  values (v_taller_a, 'María Rodríguez', '351 456-7890', 'Google') returning id into c2;
  insert into public.clientes (taller_id, nombre, telefono)
  values (v_taller_a, 'Ricardo Sosa', '11 5678-1234') returning id into c3;
  insert into public.clientes (taller_id, nombre, telefono)
  values (v_taller_a, 'Ana Martínez', null) returning id into c4;
  insert into public.clientes (taller_id, nombre, telefono)
  values (v_taller_b, 'Cliente del taller B', '11 9999-0000') returning id into cb;

  insert into public.vehiculos (taller_id, cliente_id, patente, marca, modelo, anio, km_actual)
  values (v_taller_a, c1, 'AB123CD', 'Volkswagen', 'Gol Trend', 2018, 85000) returning id into v1;
  insert into public.vehiculos (taller_id, cliente_id, patente, marca, modelo, anio, km_actual)
  values (v_taller_a, c2, 'AC456EF', 'Toyota', 'Etios', 2020, 42000) returning id into v2;
  insert into public.vehiculos (taller_id, cliente_id, patente, marca, modelo, anio, km_actual)
  values (v_taller_a, c3, 'KLM789', 'Ford', 'Fiesta', 2012, 160000) returning id into v3;
  insert into public.vehiculos (taller_id, cliente_id, patente, marca, modelo, anio)
  values (v_taller_a, c4, 'AE001ZZ', 'Fiat', 'Cronos', 2022) returning id into v4;
  insert into public.vehiculos (taller_id, cliente_id, patente, marca, modelo, anio)
  values (v_taller_b, cb, 'BB000BB', 'Renault', 'Kangoo', 2015) returning id into vb;

  -- ─── Órdenes en distintos estados ────────────────────────────────────────
  -- (Primero como presupuesto y después se cambia el estado: así corren los
  --  triggers de stock, posventa y fecha de terminación como en la app.)
  insert into public.ordenes_trabajo (taller_id, vehiculo_id, fecha, tipo_trabajo, km_ingreso, descripcion, estado, total)
  values (v_taller_a, v1, v_hoy - 20, 'service', 84000, 'Service de 80.000 km', 'presupuestado', 0) returning id into o1;
  insert into public.ordenes_trabajo (taller_id, vehiculo_id, fecha, tipo_trabajo, km_ingreso, descripcion, estado, total)
  values (v_taller_a, v2, v_hoy - 5, 'reparacion', 42000, 'Ruido al frenar', 'presupuestado', 0) returning id into o2;
  insert into public.ordenes_trabajo (taller_id, vehiculo_id, fecha, tipo_trabajo, km_ingreso, descripcion, estado, total)
  values (v_taller_a, v3, v_hoy - 2, 'service', 160000, 'Cambio de aceite y filtro', 'presupuestado', 0) returning id into o3;
  insert into public.ordenes_trabajo (taller_id, vehiculo_id, fecha, tipo_trabajo, descripcion, estado, total)
  values (v_taller_a, v4, v_hoy - 6, 'diagnostico', 'No arranca en frío', 'presupuestado', 0) returning id into o4;
  insert into public.ordenes_trabajo (taller_id, vehiculo_id, fecha, tipo_trabajo, descripcion, estado, total)
  values (v_taller_a, v1, v_hoy - 1, 'reparacion', 'Cambio de pastillas', 'presupuestado', 0) returning id into o5;
  insert into public.ordenes_trabajo (taller_id, vehiculo_id, fecha, tipo_trabajo, descripcion, estado, total)
  values (v_taller_b, vb, v_hoy - 3, 'service', 'Cambio de aceite', 'presupuestado', 0) returning id into ob;

  insert into public.items_orden (taller_id, orden_id, tipo, descripcion, cantidad, precio_unitario, precio_id, codigo) values
    (v_taller_a, o1, 'repuesto', 'Filtro de aceite', 1, 12500, p_filtro, 'FIL-01'),
    (v_taller_a, o1, 'repuesto', 'Aceite sintético 5W30 (litro)', 4, 9800, p_aceite, 'ACE-5W30'),
    (v_taller_a, o1, 'mano_de_obra', 'Mano de obra service', 1, 35000, p_mo, 'MO-SERV'),
    (v_taller_a, o2, 'repuesto', 'Pastillas de freno delanteras', 1, 45000, p_pastillas, 'PAS-DEL'),
    (v_taller_a, o2, 'mano_de_obra', 'Cambio de pastillas', 1, 25000, null, null),
    (v_taller_a, o3, 'repuesto', 'Filtro de aceite', 1, 12500, p_filtro, 'FIL-01'),
    (v_taller_a, o3, 'repuesto', 'Aceite sintético 5W30 (litro)', 4, 9800, p_aceite, 'ACE-5W30'),
    (v_taller_a, o3, 'mano_de_obra', 'Mano de obra service', 1, 35000, p_mo, 'MO-SERV'),
    (v_taller_a, o5, 'repuesto', 'Pastillas de freno delanteras', 1, 45000, p_pastillas, 'PAS-DEL'),
    (v_taller_b, ob, 'mano_de_obra', 'Cambio de aceite', 1, 20000, null, null);

  update public.ordenes_trabajo o
  set total = coalesce((select sum(round(i.cantidad * i.precio_unitario, 2)) from public.items_orden i where i.orden_id = o.id), 0)
  where o.taller_id in (v_taller_a, v_taller_b);

  update public.ordenes_trabajo set estado = 'entregado', proximo_service_fecha = v_hoy + 160, proximo_service_km = 94000 where id = o1;
  update public.ordenes_trabajo set estado = 'terminado' where id = o2;
  update public.ordenes_trabajo set estado = 'en_proceso' where id = o3;
  -- o4 queda presupuestada (sin items), o5 presupuestada y con link público.
  update public.ordenes_trabajo set estado = 'entregado' where id = ob;

  -- ─── Cobros ──────────────────────────────────────────────────────────────
  -- o1 pagada completa; o2 con seña (queda debiendo); ob pagada.
  insert into public.pagos (taller_id, orden_id, fecha, monto, concepto, medio, creado_por)
  select v_taller_a, o1, v_hoy - 18, total, 'pago', 'transferencia', v_recep_a from public.ordenes_trabajo where id = o1;
  insert into public.pagos (taller_id, orden_id, fecha, monto, concepto, medio, nota, creado_por)
  values (v_taller_a, o2, v_hoy - 4, 20000, 'sena', 'efectivo', 'Seña para pedir el repuesto', v_recep_a);
  insert into public.pagos (taller_id, orden_id, fecha, monto, concepto, medio, creado_por)
  values (v_taller_b, ob, v_hoy - 3, 20000, 'pago', 'mercadopago', v_dueno_b);

  -- ─── Link público, CRM y turno ───────────────────────────────────────────
  insert into public.ordenes_links (taller_id, orden_id, codigo, creado_por)
  values (v_taller_a, o5, repeat('ab', 32), v_recep_a);   -- link: /o/abab…ab (64 caracteres)

  insert into public.interacciones (taller_id, cliente_id, vehiculo_id, tipo, texto, creado_por)
  values (v_taller_a, c1, v1, 'nota', 'Cliente de hace años, siempre paga por transferencia.', v_dueno_a);

  insert into public.seguimientos (taller_id, cliente_id, vehiculo_id, orden_id, titulo, vence_en, asignado_a, creado_por)
  values (v_taller_a, c4, v4, o4, 'Llamar para confirmar el diagnóstico', v_hoy, v_recep_a, v_dueno_a);

  insert into public.vencimientos_vehiculo (taller_id, vehiculo_id, tipo, fecha)
  values (v_taller_a, v2, 'vtv', v_hoy + 10);

  insert into public.turnos (taller_id, cliente_id, vehiculo_id, inicio, motivo, estado, creado_por)
  values (v_taller_a, c3, v3, ((v_hoy + 2) + time '09:00') at time zone 'America/Argentina/Buenos_Aires',
          'Revisar tren delantero', 'confirmado', v_recep_a);
  insert into public.turnos (taller_id, nombre_contacto, telefono, patente, inicio, motivo, creado_por)
  values (v_taller_a, 'Pedro Nuevo', '11 3333-4444', 'AF222GH',
          ((v_hoy + 3) + time '11:00') at time zone 'America/Argentina/Buenos_Aires', 'Presupuesto de embrague', v_recep_a);

  insert into public.encuestas (taller_id, orden_id, enviada_en) values (v_taller_a, o1, now() - interval '15 days');

  raise notice 'Seed listo. Taller A: %  ·  Taller B: %', v_taller_a, v_taller_b;
end $$;

commit;
