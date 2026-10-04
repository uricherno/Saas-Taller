import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Sesion = {
  userId: string;
  tallerId: string;
  usuario: { nombre: string; email: string };
  taller: { nombre: string } | null;
};

// Devuelve el usuario logueado y su taller, o redirige a /login.
// cache() evita repetir la consulta entre el layout y la página del mismo request.
export const obtenerSesion = cache(async (): Promise<Sesion> => {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("nombre, email, taller_id, talleres(nombre)")
    .eq("id", userId)
    .maybeSingle();

  if (!usuario?.taller_id) {
    throw new Error("No se encontró el taller del usuario.");
  }

  const taller = Array.isArray(usuario.talleres) ? usuario.talleres[0] : usuario.talleres;

  return {
    userId,
    tallerId: usuario.taller_id,
    usuario: { nombre: usuario.nombre, email: usuario.email },
    taller: taller ?? null,
  };
});
