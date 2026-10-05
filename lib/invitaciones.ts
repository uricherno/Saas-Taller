import { createClient } from "@/lib/supabase/server";

export type InfoInvitacion = { taller_nombre: string; email: string; rol: string };

/**
 * Datos de una invitación vigente (no usada ni vencida), o null.
 * Usa la función info_invitacion() de la base: funciona sin sesión, porque
 * quien se registra todavía no tiene cuenta.
 */
export async function obtenerInvitacion(token: string): Promise<InfoInvitacion | null> {
  if (!/^[0-9a-f]{64}$/i.test(token)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("info_invitacion", { p_token: token });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as InfoInvitacion;
}
