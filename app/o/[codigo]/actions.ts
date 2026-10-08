"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { EstadoForm } from "@/lib/formularios";

/** El cliente acepta el presupuesto desde el link público (sin sesión). */
export async function aceptarPresupuesto(codigo: string): Promise<EstadoForm> {
  if (!/^[0-9a-f]{64}$/.test(codigo)) return { error: "El link no es válido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("aceptar_presupuesto", { p_codigo: codigo });
  if (error) {
    console.error("[link público] No se pudo aceptar el presupuesto:", error);
    return { error: "No se pudo registrar. Intentá de nuevo o comunicate con el taller." };
  }
  if (!data) return { error: "Este presupuesto ya no se puede aceptar (ya se aceptó o el taller lo cambió)." };
  revalidatePath(`/o/${codigo}`);
  return { exito: "¡Listo! Le avisamos al taller que aceptaste el presupuesto." };
}
