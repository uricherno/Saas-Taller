import { createClient } from "@/lib/supabase/server";
import { BUCKET_FOTOS, type FotoOrden } from "@/lib/fotos";

/**
 * Fotos de una orden con links firmados (vencen en 1 hora: el bucket es privado).
 * Si la migración no está corrida, devuelve null.
 */
export async function obtenerFotos(tallerId: string, ordenId: string): Promise<FotoOrden[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fotos_orden")
    .select("id, ruta, tipo, nota, subida_por")
    .eq("taller_id", tallerId)
    .eq("orden_id", ordenId)
    .order("creado_en");
  if (error) return null;
  if (!data.length) return [];

  const { data: firmadas } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrls(
    data.map((f) => f.ruta),
    60 * 60,
  );
  const urls = new Map((firmadas ?? []).map((f) => [f.path, f.signedUrl]));

  return data.map((f) => ({
    id: f.id,
    tipo: f.tipo,
    nota: f.nota,
    subidaPor: f.subida_por,
    url: urls.get(f.ruta) ?? null,
  }));
}

/** Borra del bucket los archivos de una orden (antes de borrar la orden). */
export async function borrarArchivosOrden(tallerId: string, ordenId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("fotos_orden").select("ruta").eq("taller_id", tallerId).eq("orden_id", ordenId);
  if (data?.length) await supabase.storage.from(BUCKET_FOTOS).remove(data.map((f) => f.ruta));
}
