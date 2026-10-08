-- ════════════════════════════════════════════════════════════════════════════
-- ¿Qué migraciones están corridas? Supabase → SQL Editor → pegar → Run.
-- No cambia nada. Muestra una fila por migración con "sí" o "FALTA".
-- Si una dice FALTA, correla (y las siguientes) en orden.
-- ════════════════════════════════════════════════════════════════════════════

with columnas as (
  select table_name || '.' || column_name as col
  from information_schema.columns
  where table_schema = 'public'
)
select migracion, case when corrida then 'sí' else 'FALTA' end as corrida, que_se_busco
from (values
  ('20261004_recordatorio_enviado_en',
     exists (select 1 from columnas where col = 'ordenes_trabajo.recordatorio_enviado_en'),
     'columna ordenes_trabajo.recordatorio_enviado_en'),
  ('20261005_tipo_trabajo_cancelado_mensaje',
     exists (select 1 from columnas where col = 'ordenes_trabajo.tipo_trabajo')
     and exists (select 1 from columnas where col = 'talleres.mensaje_recordatorio')
     and exists (select 1 from pg_constraint where conname = 'ordenes_trabajo_estado_check'
                 and pg_get_constraintdef(oid) like '%cancelado%'),
     'tipo_trabajo, mensaje_recordatorio y estado "cancelado"'),
  ('20261006_usuarios_roles_invitaciones',
     exists (select 1 from columnas where col = 'usuarios.rol')
     and to_regclass('public.invitaciones') is not null
     and to_regprocedure('public.mi_rol()') is not null,
     'usuarios.rol, tabla invitaciones, función mi_rol()'),
  ('20261007_crm',
     to_regclass('public.interacciones') is not null
     and to_regclass('public.seguimientos') is not null
     and to_regclass('public.clientes_resumen') is not null,
     'tablas interacciones y seguimientos, vista clientes_resumen'),
  ('20261008_lista_precios',
     to_regclass('public.precios') is not null
     and exists (select 1 from columnas where col = 'items_orden.precio_id'),
     'tabla precios, columna items_orden.precio_id'),
  ('20261009_link_publico',
     to_regclass('public.ordenes_links') is not null
     and to_regprocedure('public.orden_publica(text)') is not null,
     'tabla ordenes_links, función orden_publica()'),
  ('20261010_cobros',
     to_regclass('public.pagos') is not null
     and exists (select 1 from columnas where col = 'ordenes_trabajo.terminada_en'),
     'tabla pagos, columna ordenes_trabajo.terminada_en'),
  ('20261011_fotos_ordenes',
     to_regclass('public.fotos_orden') is not null
     and exists (select 1 from storage.buckets where id = 'fotos-ordenes' and not public),
     'tabla fotos_orden, bucket privado fotos-ordenes'),
  ('20261012_stock',
     exists (select 1 from columnas where col = 'precios.stock')
     and to_regclass('public.precios_stock_bajo') is not null,
     'columna precios.stock, vista precios_stock_bajo'),
  ('20261013_turnos_encuestas',
     to_regclass('public.turnos') is not null and to_regclass('public.encuestas') is not null,
     'tablas turnos y encuestas'),
  ('20261014_admin_saas',
     to_regclass('public.admins_saas') is not null
     and to_regprocedure('public.estado_cuenta()') is not null,
     'tabla admins_saas, función estado_cuenta()')
) as m(migracion, corrida, que_se_busco)
order by migracion;
