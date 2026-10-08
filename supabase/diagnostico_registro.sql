-- ════════════════════════════════════════════════════════════════════════════
-- Diagnóstico del error del registro ("Ocurrió un error inesperado" /
-- "Database error saving new user").
--
-- Supabase → SQL Editor → pegar TODO → Run. NO cambia nada: todo lo que hace
-- se deshace al final (rollback). Mirá los resultados de cada paso.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Triggers sobre auth.users. Tiene que haber UNO solo que llame a
--    public.handle_new_user. Si hay dos (por ejemplo uno viejo de la primera
--    versión), el segundo intenta crear el taller/usuario de nuevo y falla.
select tgname as trigger, tgfoid::regproc as funcion, tgenabled as activo
from pg_trigger
where tgrelid = 'auth.users'::regclass and not tgisinternal;

-- 2. Columnas obligatorias SIN valor por defecto en talleres y usuarios.
--    handle_new_user solo completa: talleres(nombre) y
--    usuarios(id, taller_id, nombre, email, rol). Si aparece otra columna acá,
--    esa es la causa: hay que darle un default o hacerla opcional.
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('talleres', 'usuarios')
  and is_nullable = 'NO'
  and column_default is null
order by table_name, ordinal_position;

-- 3. Usuarios de la app sin cuenta de Auth (quedan si se borró a alguien desde
--    Authentication → Users). Si usuarios.email es único, registrarse de nuevo
--    con ese email falla.
select u.id, u.email, u.taller_id
from public.usuarios u
left join auth.users au on au.id = u.id
where au.id is null;

-- 4. Prueba real: simula un registro y muestra el error EXACTO de la base.
--    CORRERLO SOLO (seleccionar este bloque y Run). Siempre termina en "error"
--    a propósito, para que no quede nada guardado. Leé el mensaje:
--      RESULTADO OK    → el trigger funciona; el problema está en otro lado
--                        (SMTP, límite de emails: mirar Logs → Auth).
--      RESULTADO FALLA → ese es el error real de la base.
do $$
declare
  v_resultado text;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, raw_app_meta_data, created_at, updated_at)
    values (
      gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'diagnostico-' || floor(random() * 1e9)::text || '@ejemplo.com',
      '{"nombre": "Prueba", "taller_nombre": "Taller de prueba"}'::jsonb,
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      now(), now()
    );
    v_resultado := 'RESULTADO OK: el trigger handle_new_user funcionó.';
  exception when others then
    v_resultado := format('RESULTADO FALLA: %s (código %s)', sqlerrm, sqlstate);
  end;
  -- Cortar acá deshace la prueba.
  raise exception '% (No se guardó nada.)', v_resultado;
end $$;
