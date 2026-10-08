"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { texto, type EstadoForm } from "@/lib/formularios";

// Las funciones de la base verifican que quien llama esté en admins_saas:
// aunque alguien llame a estas acciones sin ser admin, la base lo rechaza.

export async function suspenderTaller(tallerId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const motivo = texto(formData, "motivo").slice(0, 500);
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_suspender_taller", { p_taller_id: tallerId, p_motivo: motivo });
  if (error) {
    console.error("[admin] No se pudo suspender:", error);
    return { error: error.code === "42501" ? "No sos administrador." : "No se pudo suspender el taller." };
  }
  revalidatePath("/admin");
  return { exito: "Taller suspendido." };
}

export async function reactivarTaller(tallerId: string): Promise<EstadoForm> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_reactivar_taller", { p_taller_id: tallerId });
  if (error) {
    console.error("[admin] No se pudo reactivar:", error);
    return { error: error.code === "42501" ? "No sos administrador." : "No se pudo reactivar el taller." };
  }
  revalidatePath("/admin");
  return { exito: "Taller reactivado." };
}
