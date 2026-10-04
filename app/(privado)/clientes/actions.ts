"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";

function leerCliente(formData: FormData) {
  return {
    nombre: texto(formData, "nombre"),
    telefono: texto(formData, "telefono"),
    notas: texto(formData, "notas"),
  };
}

function validar(c: ReturnType<typeof leerCliente>): string | null {
  if (!c.nombre) return "El nombre del cliente es obligatorio.";
  if (c.nombre.length > 120) return "El nombre es demasiado largo.";
  if (c.telefono && !/^[\d\s+()-]{6,25}$/.test(c.telefono)) {
    return "El teléfono solo puede tener números, espacios, +, guiones o paréntesis.";
  }
  return null;
}

export async function crearCliente(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId } = await obtenerSesion();
  const c = leerCliente(formData);
  const error = validar(c);
  if (error) return { error, valores: c };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("clientes")
    .insert({
      taller_id: tallerId, // siempre el taller del usuario logueado
      nombre: c.nombre,
      telefono: c.telefono || null,
      notas: c.notas || null,
    })
    .select("id")
    .single();

  if (dbError) return { error: traducirErrorDb(dbError), valores: c };

  redirect(`/clientes/${data.id}`);
}

export async function actualizarCliente(
  id: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await obtenerSesion();
  const c = leerCliente(formData);
  const error = validar(c);
  if (error) return { error, valores: c };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("clientes")
    .update({ nombre: c.nombre, telefono: c.telefono || null, notas: c.notas || null })
    .eq("id", id)
    .select("id");

  if (dbError) return { error: traducirErrorDb(dbError), valores: c };
  // RLS: si no es de tu taller, no se actualiza ninguna fila.
  if (!data?.length) return { error: "No se encontró el cliente.", valores: c };

  redirect(`/clientes/${id}`);
}

export async function eliminarCliente(id: string): Promise<EstadoForm> {
  await obtenerSesion();
  const supabase = await createClient();

  const { count } = await supabase
    .from("vehiculos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id);

  if (count) {
    return {
      error: `Este cliente tiene ${count} ${count === 1 ? "vehículo" : "vehículos"}. Eliminalos primero para poder borrar el cliente.`,
    };
  }

  const { data, error } = await supabase.from("clientes").delete().eq("id", id).select("id");

  if (error) {
    return {
      error: traducirErrorDb(error, {
        enUso: "No se puede eliminar el cliente porque tiene datos asociados (vehículos u órdenes).",
      }),
    };
  }
  if (!data?.length) return { error: "No se pudo eliminar el cliente." };

  redirect("/clientes");
}
