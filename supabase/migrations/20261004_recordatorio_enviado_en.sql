-- Módulo 4: recordatorios de próximo service.
-- Registra cuándo se le avisó al cliente por WhatsApp sobre el próximo service
-- de esta orden. NULL = todavía no se avisó.
--
-- Correr en el SQL Editor de Supabase. Es segura de correr más de una vez.
-- No toca RLS ni las políticas existentes: la columna queda cubierta por las
-- mismas políticas de select/update que ya tiene ordenes_trabajo.

alter table public.ordenes_trabajo
  add column if not exists recordatorio_enviado_en timestamptz;

comment on column public.ordenes_trabajo.recordatorio_enviado_en is
  'Fecha y hora en que se envió el recordatorio de próximo service por WhatsApp (NULL = sin avisar).';

-- Recargar el esquema de la API para que la columna nueva se vea enseguida.
notify pgrst, 'reload schema';
