-- ════════════════════════════════════════════════════════════════════════════
-- Pruebas de seguridad: aislamiento entre talleres y permisos por rol.
--
-- SOLO en el Supabase de PRUEBA, después de correr supabase/seed.sql.
-- SQL Editor → pegar TODO → Run.
--
--   · Si todo está bien, el resultado es una fila: "TODAS LAS PRUEBAS PASARON".
--   · Si algo falla, aparece un error "FALLA: …" que dice qué se pudo hacer
--     y no debería (o al revés).
--
-- Todo corre dentro de una transacción que se deshace al final: no cambia datos.
-- Cada bloque se hace pasar por un usuario del seed (como lo vería la app),
-- así que las políticas RLS se aplican igual que en producción.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── Preparación (como administrador) ───────────────────────────────────────
-- IDs del seed guardados en variables de la sesión, para usarlos después.
select
  set_config('prueba.ta', (select taller_id::text from public.usuarios where id = 'aaaaaaaa-0000-4000-8000-000000000001'), true),
  set_config('prueba.tb', (select taller_id::text from public.usuarios where id = 'bbbbbbbb-0000-4000-8000-000000000001'), true);

select
  set_config('prueba.cliente_b',  (select id::text from public.clientes where taller_id = current_setting('prueba.tb')::uuid limit 1), true),
  set_config('prueba.vehiculo_a', (select id::text from public.vehiculos where patente = 'AB123CD' and taller_id = current_setting('prueba.ta')::uuid), true),
  set_config('prueba.orden_b',    (select id::text from public.ordenes_trabajo where taller_id = current_setting('prueba.tb')::uuid limit 1), true),
  set_config('prueba.orden_a',    (select id::text from public.ordenes_trabajo o where taller_id = current_setting('prueba.ta')::uuid and estado = 'en_proceso' limit 1), true),
  set_config('prueba.hay_bucket', (select count(*)::text from storage.buckets where id = 'fotos-ordenes'), true);

do $$
begin
  if current_setting('prueba.ta', true) is null or current_setting('prueba.tb', true) is null then
    raise exception 'FALLA: no se encontraron los usuarios del seed. Corré antes supabase/seed.sql.';
  end if;
end $$;


-- ─── 1. Dueño del taller A: no ve ni toca nada del taller B ────────────────
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
set local role authenticated;

do $$
declare
  tb uuid := current_setting('prueba.tb')::uuid;
  n  int;
begin
  -- Lectura
  if (select count(*) from public.clientes where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve clientes del taller B'; end if;
  if (select count(*) from public.vehiculos where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve vehículos del taller B'; end if;
  if (select count(*) from public.ordenes_trabajo where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve órdenes del taller B'; end if;
  if (select count(*) from public.items_orden where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve items del taller B'; end if;
  if (select count(*) from public.pagos where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve cobros del taller B'; end if;
  if (select count(*) from public.precios where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve precios del taller B'; end if;
  if (select count(*) from public.talleres where id = tb) > 0 then raise exception 'FALLA: el dueño A ve el taller B'; end if;
  if (select count(*) from public.usuarios where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve usuarios del taller B'; end if;
  if (select count(*) from public.clientes_resumen where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve el resumen de clientes del taller B'; end if;
  if (select count(*) from public.ordenes_saldo where taller_id = tb) > 0 then raise exception 'FALLA: el dueño A ve saldos del taller B'; end if;
  if (select count(*) from public.clientes) = 0 then raise exception 'FALLA: el dueño A no ve sus propios clientes'; end if;

  -- Escritura sobre filas del taller B: no afecta nada
  update public.ordenes_trabajo set descripcion = 'hackeado' where id = current_setting('prueba.orden_b')::uuid;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: el dueño A modificó una orden del taller B'; end if;

  delete from public.clientes where id = current_setting('prueba.cliente_b')::uuid;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: el dueño A borró un cliente del taller B'; end if;

  -- Crear filas a nombre del taller B: la base lo rechaza
  begin
    insert into public.clientes (taller_id, nombre) values (tb, 'Intruso');
    raise exception 'FALLA: el dueño A creó un cliente en el taller B';
  exception when insufficient_privilege then null;
  end;

  -- Colgar un vehículo propio de un cliente del taller B: rechazado
  begin
    insert into public.vehiculos (taller_id, cliente_id, patente)
    values (current_setting('prueba.ta')::uuid, current_setting('prueba.cliente_b')::uuid, 'ZZZ999');
    raise exception 'FALLA: el dueño A creó un vehículo para un cliente del taller B';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;

  -- Cobro en una orden del taller B: rechazado
  begin
    insert into public.pagos (taller_id, orden_id, monto, medio, creado_por)
    values (current_setting('prueba.ta')::uuid, current_setting('prueba.orden_b')::uuid, 100, 'efectivo', (select auth.uid()));
    raise exception 'FALLA: el dueño A registró un cobro en una orden del taller B';
  exception when insufficient_privilege or foreign_key_violation then null;
  end;

  -- Fotos: no puede subir a la carpeta del taller B
  if current_setting('prueba.hay_bucket') = '1' then
    begin
      insert into storage.objects (bucket_id, name) values ('fotos-ordenes', tb::text || '/x/intruso.jpg');
      raise exception 'FALLA: el dueño A subió una foto a la carpeta del taller B';
    exception when insufficient_privilege then null;
    end;
  end if;

  -- No es admin del SaaS
  begin
    perform public.admin_talleres();
    raise exception 'FALLA: el dueño A pudo usar el panel de admin';
  exception when insufficient_privilege then null;
  end;

  -- No puede sacarse (ni ponerse) una suspensión
  begin
    update public.talleres set suspendido_en = now() where id = current_setting('prueba.ta')::uuid;
    raise exception 'FALLA: el dueño A cambió la suspensión de su taller';
  exception when raise_exception then
    if sqlerrm like 'FALLA%' then raise; end if;
  end;
end $$;


-- ─── 2. Dueño del taller B: tampoco ve el taller A ──────────────────────────
reset role;
set local request.jwt.claims = '{"sub": "bbbbbbbb-0000-4000-8000-000000000001", "role": "authenticated"}';
set local role authenticated;

do $$
declare
  ta uuid := current_setting('prueba.ta')::uuid;
begin
  if (select count(*) from public.clientes where taller_id = ta) > 0 then raise exception 'FALLA: el dueño B ve clientes del taller A'; end if;
  if (select count(*) from public.ordenes_trabajo where taller_id = ta) > 0 then raise exception 'FALLA: el dueño B ve órdenes del taller A'; end if;
  if (select count(*) from public.ordenes_links where taller_id = ta) > 0 then raise exception 'FALLA: el dueño B ve links del taller A'; end if;
  if (select count(*) from public.turnos where taller_id = ta) > 0 then raise exception 'FALLA: el dueño B ve turnos del taller A'; end if;
  if (select count(*) from public.ordenes_trabajo) = 0 then raise exception 'FALLA: el dueño B no ve sus propias órdenes'; end if;
end $$;


-- ─── 3. Recepción del taller A ──────────────────────────────────────────────
reset role;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000002", "role": "authenticated"}';
set local role authenticated;

do $$
declare
  ta uuid := current_setting('prueba.ta')::uuid;
  n  int;
  v_cliente uuid;
  v_pago uuid;
begin
  -- Puede: crear clientes, registrar cobros, crear links
  insert into public.clientes (taller_id, nombre) values (ta, 'Cliente de recepción') returning id into v_cliente;
  insert into public.pagos (taller_id, orden_id, monto, medio, creado_por)
  values (ta, current_setting('prueba.orden_a')::uuid, 1000, 'efectivo', (select auth.uid())) returning id into v_pago;
  insert into public.ordenes_links (taller_id, orden_id) values (ta, current_setting('prueba.orden_a')::uuid);

  -- No puede: borrar clientes, cobros ni órdenes
  delete from public.clientes where id = v_cliente;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: recepción borró un cliente'; end if;

  delete from public.pagos where id = v_pago;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: recepción borró un cobro'; end if;

  delete from public.ordenes_trabajo where id = current_setting('prueba.orden_a')::uuid;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: recepción borró una orden'; end if;

  -- No puede: editar la lista de precios, ver invitaciones, cambiar roles, editar el taller
  update public.precios set precio = 1 where taller_id = ta;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: recepción editó la lista de precios'; end if;

  if (select count(*) from public.invitaciones) > 0 then raise exception 'FALLA: recepción ve las invitaciones'; end if;

  update public.usuarios set rol = 'dueno' where id = (select auth.uid());
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: recepción se cambió el rol a dueño'; end if;

  update public.talleres set nombre = 'Cambiado' where id = ta;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: recepción editó los datos del taller'; end if;
end $$;


-- ─── 4. Mecánico del taller A ───────────────────────────────────────────────
reset role;
set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000003", "role": "authenticated"}';
set local role authenticated;

do $$
declare
  ta uuid := current_setting('prueba.ta')::uuid;
  n  int;
  v_cliente uuid := (select cliente_id from public.vehiculos where id = current_setting('prueba.vehiculo_a')::uuid);
begin
  -- Puede: ver todo el taller, cargar items, crear notas, editar órdenes
  if (select count(*) from public.pagos) = 0 then raise exception 'FALLA: el mecánico no ve los cobros'; end if;
  insert into public.items_orden (taller_id, orden_id, tipo, descripcion, cantidad, precio_unitario)
  values (ta, current_setting('prueba.orden_a')::uuid, 'mano_de_obra', 'Prueba', 1, 100);
  insert into public.interacciones (taller_id, cliente_id, tipo, texto, creado_por)
  values (ta, v_cliente, 'nota', 'Nota del mecánico', (select auth.uid()));
  update public.ordenes_trabajo set descripcion = descripcion where id = current_setting('prueba.orden_a')::uuid;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'FALLA: el mecánico no puede editar una orden'; end if;

  -- No puede: crear clientes
  begin
    insert into public.clientes (taller_id, nombre) values (ta, 'Del mecánico');
    raise exception 'FALLA: el mecánico creó un cliente';
  exception when insufficient_privilege then null;
  end;

  -- No puede: registrar interacciones que no sean notas (ej: WhatsApp)
  begin
    insert into public.interacciones (taller_id, cliente_id, tipo, texto, creado_por)
    values (ta, v_cliente, 'whatsapp', 'No debería', (select auth.uid()));
    raise exception 'FALLA: el mecánico registró un WhatsApp';
  exception when insufficient_privilege then null;
  end;

  -- No puede: cobrar
  begin
    insert into public.pagos (taller_id, orden_id, monto, medio, creado_por)
    values (ta, current_setting('prueba.orden_a')::uuid, 100, 'efectivo', (select auth.uid()));
    raise exception 'FALLA: el mecánico registró un cobro';
  exception when insufficient_privilege then null;
  end;

  -- No puede: crear links públicos ni seguimientos
  begin
    insert into public.ordenes_links (taller_id, orden_id) values (ta, current_setting('prueba.orden_a')::uuid);
    raise exception 'FALLA: el mecánico creó un link público';
  exception when insufficient_privilege or unique_violation then null;
  end;
  begin
    insert into public.seguimientos (taller_id, cliente_id, titulo, vence_en) values (ta, v_cliente, 'No debería', current_date);
    raise exception 'FALLA: el mecánico creó un seguimiento';
  exception when insufficient_privilege then null;
  end;

  -- No puede: borrar órdenes, vehículos ni clientes
  delete from public.ordenes_trabajo where id = current_setting('prueba.orden_a')::uuid;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: el mecánico borró una orden'; end if;
  delete from public.vehiculos where id = current_setting('prueba.vehiculo_a')::uuid;
  get diagnostics n = row_count;
  if n > 0 then raise exception 'FALLA: el mecánico borró un vehículo'; end if;
end $$;


-- ─── 5. Visitante sin sesión (anon) ─────────────────────────────────────────
reset role;
set local request.jwt.claims = '{"role": "anon"}';
set local role anon;

do $$
declare
  v_orden jsonb;
  n int := 0;
begin
  -- No lee ninguna tabla
  begin
    select count(*) into n from public.clientes;
  exception when insufficient_privilege then n := 0;
  end;
  if n > 0 then raise exception 'FALLA: un visitante sin sesión ve clientes'; end if;
  begin
    select count(*) into n from public.ordenes_trabajo;
  exception when insufficient_privilege then n := 0;
  end;
  if n > 0 then raise exception 'FALLA: un visitante sin sesión ve órdenes'; end if;

  -- Link público: con un código inventado no devuelve nada
  if public.orden_publica(repeat('0', 64)) is not null then raise exception 'FALLA: un código inventado devolvió una orden'; end if;
  if public.orden_publica('cualquier cosa') is not null then raise exception 'FALLA: un código inválido devolvió una orden'; end if;

  -- Con el código del seed devuelve SOLO esa orden, sin el teléfono del cliente
  v_orden := public.orden_publica(repeat('ab', 32));
  if v_orden is null then raise exception 'FALLA: el link público del seed no devuelve la orden'; end if;
  if v_orden -> 'taller' ->> 'nombre' <> 'Taller El Pistón' then raise exception 'FALLA: el link público devuelve otro taller'; end if;
  if v_orden::text like '%11 2345-6789%' then raise exception 'FALLA: el link público expone el teléfono del cliente'; end if;

  -- Aceptar: la primera vez sí, la segunda no
  if not public.aceptar_presupuesto(repeat('ab', 32)) then raise exception 'FALLA: no se pudo aceptar el presupuesto del seed'; end if;
  if public.aceptar_presupuesto(repeat('ab', 32)) then raise exception 'FALLA: se aceptó dos veces el mismo presupuesto'; end if;
  if public.aceptar_presupuesto(repeat('0', 64)) then raise exception 'FALLA: se aceptó un presupuesto con un código inventado'; end if;
end $$;


-- ─── 6. Stock y fecha de terminación (como administrador) ───────────────────
reset role;

do $$
declare
  ta uuid := current_setting('prueba.ta')::uuid;
  v_stock numeric;
begin
  -- Seed: FIL-01 arranca en 6; se usa 1 en una orden entregada y 1 en una en proceso → 4.
  select stock into v_stock from public.precios where taller_id = ta and codigo = 'FIL-01';
  if v_stock <> 4 then raise exception 'FALLA: stock de FIL-01 = % (se esperaba 4)', v_stock; end if;

  -- Cancelar la orden en proceso devuelve el filtro.
  update public.ordenes_trabajo set estado = 'cancelado' where id = current_setting('prueba.orden_a')::uuid;
  select stock into v_stock from public.precios where taller_id = ta and codigo = 'FIL-01';
  if v_stock <> 5 then raise exception 'FALLA: al cancelar no se devolvió el stock (FIL-01 = %, se esperaba 5)', v_stock; end if;

  -- Las órdenes entregadas tienen fecha de terminación; las canceladas no.
  if exists (select 1 from public.ordenes_trabajo where taller_id = ta and estado in ('terminado', 'entregado') and terminada_en is null) then
    raise exception 'FALLA: hay órdenes terminadas sin terminada_en';
  end if;
  if (select terminada_en from public.ordenes_trabajo where id = current_setting('prueba.orden_a')::uuid) is not null then
    raise exception 'FALLA: una orden cancelada quedó con terminada_en';
  end if;
end $$;


-- ─── 7. Taller suspendido: nadie del taller ve nada ─────────────────────────
update public.talleres set suspendido_en = now() where id = current_setting('prueba.ta')::uuid;

set local request.jwt.claims = '{"sub": "aaaaaaaa-0000-4000-8000-000000000001", "role": "authenticated"}';
set local role authenticated;

do $$
begin
  if (select count(*) from public.clientes) > 0 then raise exception 'FALLA: el dueño de un taller suspendido ve clientes'; end if;
  if (select count(*) from public.ordenes_trabajo) > 0 then raise exception 'FALLA: el dueño de un taller suspendido ve órdenes'; end if;
  if public.estado_cuenta() <> 'suspendido' then raise exception 'FALLA: estado_cuenta() no avisa la suspensión'; end if;
end $$;

reset role;
rollback;

select 'TODAS LAS PRUEBAS PASARON' as resultado;
