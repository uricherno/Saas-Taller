-- ════════════════════════════════════════════════════════════════════════════
-- Fotos en la orden (del auto al ingresar y del problema), privadas por taller.
--
-- CÓMO CORRERLA
--   1. Antes tienen que estar corridas 20261004 → 20261010.
--   2. Supabase → SQL Editor → New query → pegar TODO este archivo → Run.
--   3. Corre en una transacción. Se puede correr más de una vez.
--
-- QUÉ HACE
--   Bucket "fotos-ordenes" en Supabase Storage, PRIVADO (no hay links públicos:
--   la app genera links firmados que vencen en 1 hora).
--   Cada archivo se guarda en  <taller_id>/<orden_id>/<archivo>.jpg
--   y las políticas de storage solo dejan tocar la carpeta del propio taller.
--   fotos_orden → una fila por foto (tipo, nota, quién la subió).
--
-- PERMISOS
--   Ver y subir: todos los miembros (el mecánico saca fotos del problema).
--   Borrar: el dueño, o quien subió la foto.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── 1. Bucket privado ──────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos-ordenes', 'fotos-ordenes', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;


-- ─── 2. Tabla de fotos ──────────────────────────────────────────────────────

create table if not exists public.fotos_orden (
  id          uuid primary key default gen_random_uuid(),
  taller_id   uuid not null references public.talleres (id) on delete cascade,
  orden_id    uuid not null,
  ruta        text not null unique,
  tipo        text not null default 'auto' check (tipo in ('auto', 'problema')),
  nota        text check (nota is null or length(nota) <= 300),
  subida_por  uuid default auth.uid(),
  creado_en   timestamptz not null default now(),

  -- La ruta tiene que estar dentro de la carpeta del taller y de la orden.
  constraint fotos_orden_ruta_check check (ruta like taller_id::text || '/' || orden_id::text || '/%'),
  foreign key (taller_id, orden_id) references public.ordenes_trabajo (taller_id, id) on delete cascade
);

create index if not exists fotos_orden_idx on public.fotos_orden (taller_id, orden_id, creado_en);

alter table public.fotos_orden enable row level security;

revoke all on public.fotos_orden from anon;
grant select, insert, delete on public.fotos_orden to authenticated;

do $$
declare
  p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'fotos_orden' loop
    execute format('drop policy %I on public.fotos_orden', p.policyname);
  end loop;
end $$;

create policy "fotos_orden: leer miembros" on public.fotos_orden
  for select to authenticated
  using (taller_id = (select public.mi_taller_id()));

create policy "fotos_orden: subir miembros" on public.fotos_orden
  for insert to authenticated
  with check (taller_id = (select public.mi_taller_id())
              and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico')
              and subida_por = (select auth.uid()));

create policy "fotos_orden: borrar dueño o autor" on public.fotos_orden
  for delete to authenticated
  using (taller_id = (select public.mi_taller_id())
         and ((select public.mi_rol()) = 'dueno' or subida_por = (select auth.uid())));


-- ─── 3. Políticas del bucket ────────────────────────────────────────────────
-- (storage.foldername(name))[1] es la primera carpeta de la ruta = taller_id.

drop policy if exists "fotos-ordenes: leer taller"   on storage.objects;
drop policy if exists "fotos-ordenes: subir taller"  on storage.objects;
drop policy if exists "fotos-ordenes: borrar taller" on storage.objects;

create policy "fotos-ordenes: leer taller" on storage.objects
  for select to authenticated
  using (bucket_id = 'fotos-ordenes'
         and (storage.foldername(name))[1] = (select public.mi_taller_id())::text);

create policy "fotos-ordenes: subir taller" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos-ordenes'
              and (storage.foldername(name))[1] = (select public.mi_taller_id())::text
              and (select public.mi_rol()) in ('dueno', 'recepcion', 'mecanico'));

-- Borrar: el dueño, o quien subió el archivo. (La app borra primero el archivo
-- y después la fila de fotos_orden.)
create policy "fotos-ordenes: borrar taller" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos-ordenes'
         and (storage.foldername(name))[1] = (select public.mi_taller_id())::text
         and ((select public.mi_rol()) = 'dueno' or owner_id = (select auth.uid())::text));

commit;

notify pgrst, 'reload schema';
