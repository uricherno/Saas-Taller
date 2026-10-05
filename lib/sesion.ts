import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { faltaMigracion } from "@/lib/db-errores";
import { esRol, puede, type Permiso, type Rol } from "@/lib/permisos";

export type Sesion = {
  userId: string;
  tallerId: string;
  rol: Rol;
  usuario: { nombre: string; email: string };
  taller: { nombre: string } | null;
};

type FilaUsuario = {
  nombre: string;
  email: string;
  taller_id: string;
  rol?: string;
  activo?: boolean;
  talleres: { nombre: string } | { nombre: string }[] | null;
};

// Devuelve el usuario logueado, su taller y su rol, o redirige a /login.
// Si el usuario fue desactivado, cierra la sesión y avisa.
// cache() evita repetir la consulta entre el layout y la página del mismo request.
export const obtenerSesion = cache(async (): Promise<Sesion> => {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  let { data: usuario, error } = await supabase
    .from("usuarios")
    .select("nombre, email, taller_id, rol, activo, talleres(nombre)")
    .eq("id", userId)
    .maybeSingle<FilaUsuario>();

  // Antes de correr la migración de roles no existen rol ni activo: todos son dueños.
  if (faltaMigracion(error)) {
    ({ data: usuario, error } = await supabase
      .from("usuarios")
      .select("nombre, email, taller_id, talleres(nombre)")
      .eq("id", userId)
      .maybeSingle<FilaUsuario>());
  }

  if (usuario?.activo === false) {
    // Un Server Component no puede borrar cookies: lo hace esta ruta.
    redirect("/auth/salir?motivo=desactivado");
  }
  if (!usuario?.taller_id) {
    throw new Error("No se encontró el taller del usuario.");
  }

  const taller = Array.isArray(usuario.talleres) ? usuario.talleres[0] : usuario.talleres;
  const rol = usuario.rol && esRol(usuario.rol) ? usuario.rol : "dueno";

  return {
    userId,
    tallerId: usuario.taller_id,
    rol,
    usuario: { nombre: usuario.nombre, email: usuario.email },
    taller: taller ?? null,
  };
});

/** Para server actions: la sesión, o un mensaje de error si el rol no alcanza. */
export async function sesionCon(permiso: Permiso): Promise<Sesion & { sinPermiso: boolean }> {
  const sesion = await obtenerSesion();
  return { ...sesion, sinPermiso: !puede(sesion.rol, permiso) };
}
