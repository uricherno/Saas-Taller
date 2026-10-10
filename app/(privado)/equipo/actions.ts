"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { esRol, SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";
import { linkInvitacion, origenActual } from "@/lib/origen";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function invitar(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, userId, sinPermiso } = await sesionCon("equipo");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = { email: texto(formData, "email").toLowerCase(), rol: texto(formData, "rol") };
  if (!EMAIL_RE.test(valores.email)) return { error: "Escribí un email válido.", valores };
  if (!esRol(valores.rol)) return { error: "Elegí el rol.", valores };

  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("usuarios")
    .select("id")
    .eq("taller_id", tallerId)
    .eq("email", valores.email) // Supabase guarda los emails en minúscula
    .maybeSingle();
  if (existente) return { error: `${valores.email} ya es parte del equipo.`, valores };

  const { data, error } = await supabase
    .from("invitaciones")
    .insert({ taller_id: tallerId, email: valores.email, rol: valores.rol, creada_por: userId })
    .select("token")
    .single();

  if (error) return { error: traducirErrorDb(error), valores };

  revalidatePath("/equipo");
  return {
    exito: `Invitación creada para ${valores.email}. Vence en 7 días.`,
    valores: { email: valores.email, rol: valores.rol, link: linkInvitacion(await origenActual(), data.token) },
  };
}

export async function cambiarRol(usuarioId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, userId, sinPermiso } = await sesionCon("equipo");
  if (sinPermiso) return { error: SIN_PERMISO };
  if (usuarioId === userId) return { error: "No podés cambiar tu propio rol." };

  const rol = texto(formData, "rol");
  if (!esRol(rol)) return { error: "Elegí un rol válido." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .update({ rol })
    .eq("id", usuarioId)
    .eq("taller_id", tallerId)
    .select("id");

  if (error) return { error: traducirErrorDb(error) };
  if (!data?.length) return { error: "No se encontró el usuario." };

  revalidatePath("/equipo");
  return { exito: "Rol actualizado." };
}

export async function cambiarActivo(usuarioId: string, activo: boolean): Promise<EstadoForm> {
  const { tallerId, userId, sinPermiso } = await sesionCon("equipo");
  if (sinPermiso) return { error: SIN_PERMISO };
  if (usuarioId === userId) return { error: "No podés desactivarte a vos mismo." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("usuarios")
    .update({ activo })
    .eq("id", usuarioId)
    .eq("taller_id", tallerId)
    .select("id");

  if (error) return { error: traducirErrorDb(error) };
  if (!data?.length) return { error: "No se encontró el usuario." };

  revalidatePath("/equipo");
  return { exito: activo ? "Usuario reactivado." : "Usuario desactivado: ya no puede entrar." };
}

export async function borrarInvitacion(id: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("equipo");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase.from("invitaciones").delete().eq("id", id).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };

  revalidatePath("/equipo");
  return {};
}

const MENSAJES_CREAR: Record<string, string> = {
  sin_permiso: SIN_PERMISO,
  datos: "Revisá los datos: nombre, email válido y contraseña de al menos 8 caracteres.",
  existe: "Ya existe una cuenta con ese email.",
};

/** El dueño crea el usuario con contraseña, sin mandar mails (se la pasa él a la persona). */
export async function crearEmpleado(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { sinPermiso } = await sesionCon("equipo");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = {
    nombre: texto(formData, "nombre"),
    email: texto(formData, "email").toLowerCase(),
    rol: texto(formData, "rol"),
  };
  const clave = String(formData.get("clave") ?? "");
  if (!valores.nombre) return { error: "Escribí el nombre.", valores };
  if (!EMAIL_RE.test(valores.email)) return { error: "Escribí un email válido (puede ser inventado, no se le manda nada).", valores };
  if (!esRol(valores.rol)) return { error: "Elegí el rol.", valores };
  if (clave.length < 8) return { error: "La contraseña tiene que tener al menos 8 caracteres.", valores };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("crear_empleado", {
    p_email: valores.email,
    p_nombre: valores.nombre,
    p_rol: valores.rol,
    p_clave: clave,
  });
  if (error) {
    console.error("[equipo] No se pudo crear el usuario:", error);
    return {
      error: error.code === "PGRST202" ? "Falta correr la migración 20261016_crear_empleado.sql en Supabase." : "No se pudo crear el usuario.",
      valores,
    };
  }
  if (data !== "ok") return { error: MENSAJES_CREAR[String(data)] ?? "No se pudo crear el usuario.", valores };

  revalidatePath("/equipo");
  return {
    exito: `Listo: ${valores.nombre} ya puede entrar con ${valores.email} y la contraseña que pusiste.`,
    valores: { email: valores.email, clave },
  };
}
