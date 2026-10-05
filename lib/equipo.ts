import { createClient } from "@/lib/supabase/server";

export type Miembro = { id: string; nombre: string; activo: boolean };

/** Miembros del taller, para mostrar autores y asignar seguimientos. */
export async function obtenerEquipo(tallerId: string): Promise<Miembro[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuarios")
    .select("id, nombre, activo")
    .eq("taller_id", tallerId)
    .order("nombre");
  return (data ?? []).map((u) => ({ id: u.id, nombre: u.nombre, activo: u.activo !== false }));
}
