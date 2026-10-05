"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";
import { normalizarEtiquetas } from "@/lib/crm";

function leerCliente(formData: FormData) {
  return {
    nombre: texto(formData, "nombre"),
    telefono: texto(formData, "telefono"),
    notas: texto(formData, "notas"),
    origen: texto(formData, "origen"),
    etiquetas: texto(formData, "etiquetas"),
  };
}

/** Columnas a guardar (origen vacío → null, etiquetas normalizadas). */
function columnas(c: ReturnType<typeof leerCliente>) {
  return {
    nombre: c.nombre,
    telefono: c.telefono || null,
    notas: c.notas || null,
    origen: c.origen || null,
    etiquetas: normalizarEtiquetas(c.etiquetas),
  };
}

function validar(c: ReturnType<typeof leerCliente>): string | null {
  if (!c.nombre) return "El nombre del cliente es obligatorio.";
  if (c.nombre.length > 120) return "El nombre es demasiado largo.";
  if (c.telefono && !/^[\d\s+()-]{6,25}$/.test(c.telefono)) {
    return "El teléfono solo puede tener números, espacios, +, guiones o paréntesis.";
  }
  if (c.origen.length > 60) return "El origen es demasiado largo.";
  return null;
}

export async function crearCliente(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("editarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const c = leerCliente(formData);
  const error = validar(c);
  if (error) return { error, valores: c };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("clientes")
    .insert({
      taller_id: tallerId, // siempre el taller del usuario logueado
      ...columnas(c),
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
  const { tallerId, sinPermiso } = await sesionCon("editarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const c = leerCliente(formData);
  const error = validar(c);
  if (error) return { error, valores: c };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("clientes")
    .update(columnas(c))
    .eq("id", id)
    .eq("taller_id", tallerId)
    .select("id");

  if (dbError) return { error: traducirErrorDb(dbError), valores: c };
  // RLS: si no es de tu taller, no se actualiza ninguna fila.
  if (!data?.length) return { error: "No se encontró el cliente.", valores: c };

  redirect(`/clientes/${id}`);
}

export async function eliminarCliente(id: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("borrar");
  if (sinPermiso) return { error: SIN_PERMISO };
  const supabase = await createClient();

  const { count } = await supabase
    .from("vehiculos")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", id)
    .eq("taller_id", tallerId);

  if (count) {
    return {
      error: `Este cliente tiene ${count} ${count === 1 ? "vehículo" : "vehículos"}. Eliminalos primero para poder borrar el cliente.`,
    };
  }

  const { data, error } = await supabase.from("clientes").delete().eq("id", id).eq("taller_id", tallerId).select("id");

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
