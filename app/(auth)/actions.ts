"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { traducirErrorAuth } from "@/lib/auth-errores";

export type EstadoForm = {
  error?: string;
  exito?: string;
  valores?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: traducirErrorAuth(error), valores };

  redirect("/inicio");
}

export async function registrarse(
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const taller_nombre = texto(formData, "taller_nombre");
  const nombre = texto(formData, "nombre");
  const email = texto(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");
  const valores = { taller_nombre, nombre, email };

  if (!taller_nombre || !nombre || !email || !password) {
    return { error: "Completá todos los campos.", valores };
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
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger de la base crea el taller y el usuario con estos datos.
      data: { nombre, taller_nombre },
      emailRedirectTo: `${origin}/auth/confirmar`,
    },
  });

  if (error) return { error: traducirErrorAuth(error), valores };

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

export async function cerrarSesion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
