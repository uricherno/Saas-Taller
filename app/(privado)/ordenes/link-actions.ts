"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import type { EstadoForm } from "@/lib/formularios";

/** Crea el link público de la orden (si ya existe, no hace nada). */
export async function crearLinkPublico(ordenId: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const supabase = await createClient();

  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select("id")
    .eq("id", ordenId)
    .eq("taller_id", tallerId)
    .maybeSingle();
  if (!orden) return { error: "No se encontró la orden." };

  const { error } = await supabase
    .from("ordenes_links")
    .upsert({ taller_id: tallerId, orden_id: ordenId }, { onConflict: "orden_id", ignoreDuplicates: true });
  if (error) return { error: traducirErrorDb(error) };

  revalidatePath(`/ordenes/${ordenId}`);
  return {};
}

/** Anula el link: el que tenga el link viejo ya no puede ver la orden. */
export async function anularLinkPublico(ordenId: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { error } = await supabase.from("ordenes_links").delete().eq("orden_id", ordenId).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };
  revalidatePath(`/ordenes/${ordenId}`);
  return {};
}
