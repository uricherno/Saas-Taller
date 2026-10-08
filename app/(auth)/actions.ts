"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { traducirErrorAuth } from "@/lib/auth-errores";
import { obtenerInvitacion } from "@/lib/invitaciones";

export type EstadoForm = {
  error?: string;
  exito?: string;
  valores?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MENSAJE_DESACTIVADO =
  "Tu usuario está desactivado. Pedile al dueño del taller que te vuelva a activar.";
const MENSAJE_SUSPENDIDO = "La cuenta de este taller está suspendida. Escribinos para reactivarla.";
const MENSAJE_INVITACION_INVALIDA =
  "La invitación no es válida: ya se usó, venció o fue borrada. Pedile al dueño del taller una nueva.";

function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

export async function iniciarSesion(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = texto(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const valores = { email };

  if (!email || !password) {
    return { error: "Completá el email y la contraseña.", valores };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: traducirErrorAuth(error), valores };

  // Un usuario desactivado por el dueño no puede entrar.
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("activo")
    .eq("id", data.user.id)
    .maybeSingle<{ activo?: boolean }>();
  if (usuario?.activo === false) {
    await supabase.auth.signOut();
    return { error: MENSAJE_DESACTIVADO, valores };
  }
  // Taller suspendido desde el panel de admin. (Sin la migración 20261014 la función no existe y se ignora.)
  const { data: estado } = await supabase.rpc("estado_cuenta");
  if (estado === "suspendido") {
    await supabase.auth.signOut();
    return { error: MENSAJE_SUSPENDIDO, valores };
  }

  redirect("/inicio");
}

export async function registrarse(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const invitacion = texto(formData, "invitacion");
  const taller_nombre = texto(formData, "taller_nombre");
  const nombre = texto(formData, "nombre");
  const email = texto(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const valores = { taller_nombre, nombre, email };

  if ((!invitacion && !taller_nombre) || !nombre || !email || !password) {
    return { error: "Completá todos los campos.", valores };
  }
  if (formData.get("acepto") !== "on") {
    return { error: "Para crear la cuenta tenés que aceptar los Términos y la Política de privacidad.", valores };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "El email no es válido.", valores };
  }
  if (password.length < 6) {
    return {
      error: "La contraseña tiene que tener al menos 6 caracteres.",
      valores,
    };
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();

  // Con invitación: verificar antes que siga vigente y sea para este email.
  // (Si fallara en la base, Supabase solo devolvería un error genérico.)
  if (invitacion) {
    const info = await obtenerInvitacion(invitacion);
    if (!info) return { error: MENSAJE_INVITACION_INVALIDA, valores };
    if (info.email !== email) {
      return { error: `Esta invitación es para ${info.email}. Registrate con ese email.`, valores };
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger de la base crea el usuario con estos datos: con invitación
      // se une a ese taller; sin invitación crea un taller nuevo.
      // terminos_aceptados_en queda guardado en la cuenta como constancia.
      data: {
        nombre,
        ...(invitacion ? { invitacion } : { taller_nombre }),
        terminos_aceptados_en: new Date().toISOString(),
      },
      emailRedirectTo: `${origin}/auth/confirmar`,
    },
  });

  if (error) {
    // El trigger rechazó la invitación (por ej. se usó justo antes).
    if (invitacion && (error.code === "unexpected_failure" || /database error/i.test(error.message))) {
      console.error("[auth] La base rechazó el alta con invitación:", { code: error.code, message: error.message });
      return { error: MENSAJE_INVITACION_INVALIDA, valores };
    }
    return { error: traducirErrorAuth(error), valores };
  }

  // Con confirmación de email activa, Supabase no devuelve error si el email
  // ya existe: devuelve un usuario sin identidades.
  if (data.user && data.user.identities?.length === 0) {
    return {
      error: "Ya existe una cuenta con ese email. Probá iniciar sesión.",
      valores,
    };
  }

  // Si la confirmación de email está desactivada, ya hay sesión.
  if (data.session) redirect("/inicio");

  return {
    exito: `Te enviamos un email a ${email}. Abrí el enlace para confirmar tu cuenta y después iniciá sesión.`,
  };
}

export async function cerrarSesion(formData?: FormData) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Opcional: volver a una ruta interna (ej: el enlace de una invitación).
  const volver = formData ? texto(formData, "volver") : "";
  redirect(volver.startsWith("/") && !volver.startsWith("//") ? volver : "/login");
}

export async function pedirRecuperacion(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const email = texto(formData, "email").toLowerCase();
  const valores = { email };

  if (!email) return { error: "Escribí tu email.", valores };
  if (!EMAIL_RE.test(email)) return { error: "El email no es válido.", valores };

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirmar?next=/nueva-clave`,
  });

  // Los límites de envío sí se informan; cualquier otro caso responde igual,
  // para no revelar si el email tiene cuenta o no.
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { error: traducirErrorAuth(error), valores };
  }

  return {
    exito: `Si ${email} tiene una cuenta, te llegará un email con un enlace para elegir una nueva contraseña. Revisá también la carpeta de spam.`,
  };
}

export async function cambiarClave(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (password.length < 6) return { error: "La contraseña tiene que tener al menos 6 caracteres." };
  if (password !== confirmacion) return { error: "Las dos contraseñas no coinciden." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) {
    return { error: "El enlace venció. Pedí uno nuevo desde “Olvidé mi contraseña”." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traducirErrorAuth(error) };

  redirect("/inicio");
}
