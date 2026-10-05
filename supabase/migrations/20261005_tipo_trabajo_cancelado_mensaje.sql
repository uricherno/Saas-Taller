-- Mejoras: tipo de trabajo, estado "cancelado" y mensaje de recordatorio por taller.
--
-- Correr en el SQL Editor de Supabase (todo junto). Es segura de correr más de
-- una vez. No toca RLS ni las políticas existentes.

begin;

-- 1. Tipo de trabajo de cada orden.
alter table public.ordenes_trabajo
  add column if not exists tipo_trabajo text not null default 'service';

alter table public.ordenes_trabajo
  drop constraint if exists ordenes_trabajo_tipo_trabajo_check;

alter table public.ordenes_trabajo
  add constraint ordenes_trabajo_tipo_trabajo_check
  check (tipo_trabajo in ('service', 'reparacion', 'diagnostico', 'otro'));

-- 2. Permitir el estado "cancelado".
--    Se borra cualquier check existente sobre la columna estado (sin importar
--    cómo se llame) y se crea uno nuevo con los cinco estados.
do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = 'public.ordenes_trabajo'::regclass
      and con.contype = 'c'
      and att.attname = 'estado'
  loop
    execute format('alter table public.ordenes_trabajo drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.ordenes_trabajo
  add constraint ordenes_trabajo_estado_check
  check (estado in ('presupuestado', 'en_proceso', 'terminado', 'entregado', 'cancelado'));

-- 3. Texto del mensaje de WhatsApp de los recordatorios (NULL = mensaje por defecto).
alter table public.talleres
  add column if not exists mensaje_recordatorio text;

commit;

-- Recargar el esquema de la API para que las columnas nuevas se vean enseguida.
notify pgrst, 'reload schema';
