"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { puede, SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";
import { BUCKET_FOTOS, TIPOS_IMAGEN } from "@/lib/fotos";

const MAX_BYTES = 8 * 1024 * 1024;

/** Sube UNA foto (el navegador ya la achica antes de mandarla). */
export async function subirFoto(ordenId: string, formData: FormData): Promise<EstadoForm> {
  const { tallerId, userId, sinPermiso } = await sesionCon("editarOrdenes");
  if (sinPermiso) return { error: SIN_PERMISO };

  const archivo = formData.get("foto");
  const tipo = texto(formData, "tipo") === "problema" ? "problema" : "auto";
  const nota = texto(formData, "nota").slice(0, 300);
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí una foto." };
  const extension = TIPOS_IMAGEN[archivo.type as keyof typeof TIPOS_IMAGEN];
  if (!extension) return { error: "La foto tiene que ser JPG, PNG o WEBP." };
  if (archivo.size > MAX_BYTES) return { error: "La foto es demasiado grande (máximo 8 MB)." };

  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select("id")
    .eq("id", ordenId)
    .eq("taller_id", tallerId)
    .maybeSingle();
  if (!orden) return { error: "No se encontró la orden." };

  // La primera carpeta tiene que ser el taller: así lo exigen las políticas del bucket.
  const ruta = `${tallerId}/${ordenId}/${crypto.randomUUID()}.${extension}`;
  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_FOTOS)
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (errorSubida) {
    console.error("[fotos] No se pudo subir:", errorSubida);
    return { error: "No se pudo subir la foto. Revisá que esté corrida la migración 20261011 e intentá de nuevo." };
  }

  const { error } = await supabase
    .from("fotos_orden")
    .insert({ taller_id: tallerId, orden_id: ordenId, ruta, tipo, nota: nota || null, subida_por: userId });
  if (error) {
    await supabase.storage.from(BUCKET_FOTOS).remove([ruta]);
    return { error: traducirErrorDb(error) };
  }

  revalidatePath(`/ordenes/${ordenId}`);
  return { exito: "Foto subida." };
}

/** Borra una foto: el dueño, o quien la subió. */
export async function borrarFoto(fotoId: string, ordenId: string): Promise<EstadoForm> {
  const { tallerId, userId, rol } = await sesionCon("editarOrdenes");
  const supabase = await createClient();

  const { data: foto } = await supabase
    .from("fotos_orden")
    .select("id, ruta, subida_por")
    .eq("id", fotoId)
    .eq("taller_id", tallerId)
    .maybeSingle();
  if (!foto) return { error: "No se encontró la foto." };
  if (!puede(rol, "borrar") && foto.subida_por !== userId) return { error: SIN_PERMISO };

  // Primero el archivo y después la fila (la política del bucket mira quién la subió).
  const { error: errorArchivo } = await supabase.storage.from(BUCKET_FOTOS).remove([foto.ruta]);
  if (errorArchivo) return { error: "No se pudo borrar la foto. Intentá de nuevo." };

  const { error } = await supabase.from("fotos_orden").delete().eq("id", fotoId).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };

  revalidatePath(`/ordenes/${ordenId}`);
  return {};
}
