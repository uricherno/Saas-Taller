"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { traducirErrorDb } from "@/lib/db-errores";
import { entero, texto, type EstadoForm } from "@/lib/formularios";

const PATENTE_DUPLICADA = (p: string) =>
  `La patente ${p} ya está registrada en tu taller. Buscala en la lista de clientes antes de cargarla de nuevo.`;

/** "ab 123-cd" → "AB123CD": así "AB 123 CD" y "ab123cd" cuentan como la misma patente. */
function normalizarPatente(p: string) {
  return p.toUpperCase().replace(/[\s.-]/g, "");
}

function leerVehiculo(formData: FormData) {
  return {
    patente: normalizarPatente(texto(formData, "patente")),
    marca: texto(formData, "marca"),
    modelo: texto(formData, "modelo"),
    anio: texto(formData, "anio"),
    km_actual: texto(formData, "km_actual"),
  };
}

type Valores = ReturnType<typeof leerVehiculo>;

function validar(v: Valores) {
  if (!v.patente) return { error: "La patente es obligatoria." };
  if (!/^[A-Z0-9]{5,10}$/.test(v.patente)) {
    return { error: "La patente solo puede tener letras y números (entre 5 y 10 caracteres)." };
  }

  const anio = entero(v.anio);
  const maxAnio = new Date().getFullYear() + 1;
  if (anio !== null && (Number.isNaN(anio) || anio < 1900 || anio > maxAnio)) {
    return { error: `El año tiene que ser un número entre 1900 y ${maxAnio}.` };
  }

  const km = entero(v.km_actual);
  if (km !== null && (Number.isNaN(km) || km > 3_000_000)) {
    return { error: "El kilometraje tiene que ser un número entero positivo." };
  }

  return {
    datos: {
      patente: v.patente,
      marca: v.marca || null,
      modelo: v.modelo || null,
      anio,
      km_actual: km,
    },
  };
}

async function patenteRepetida(tallerId: string, patente: string, excluirId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("vehiculos")
    .select("id", { count: "exact", head: true })
    .eq("taller_id", tallerId)
    .eq("patente", patente);
  if (excluirId) query = query.neq("id", excluirId);
  const { count } = await query;
  return Boolean(count);
}

export async function crearVehiculo(
  clienteId: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId } = await obtenerSesion();
  const valores = leerVehiculo(formData);
  const { error, datos } = validar(valores);
  if (error || !datos) return { error, valores };

  const supabase = await createClient();

  // Confirmar que el cliente existe y es visible para este taller (RLS).
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cliente) return { error: "No se encontró el cliente.", valores };

  if (await patenteRepetida(tallerId, datos.patente)) {
    return { error: PATENTE_DUPLICADA(datos.patente), valores };
  }

  const { data, error: dbError } = await supabase
    .from("vehiculos")
    .insert({ ...datos, taller_id: tallerId, cliente_id: clienteId })
    .select("id")
    .single();

  if (dbError) {
    return { error: traducirErrorDb(dbError, { duplicado: PATENTE_DUPLICADA(datos.patente) }), valores };
  }

  redirect(`/vehiculos/${data.id}`);
}

export async function actualizarVehiculo(
  id: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId } = await obtenerSesion();
  const valores = leerVehiculo(formData);
  const { error, datos } = validar(valores);
  if (error || !datos) return { error, valores };

  if (await patenteRepetida(tallerId, datos.patente, id)) {
    return { error: PATENTE_DUPLICADA(datos.patente), valores };
  }

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("vehiculos")
    .update(datos)
    .eq("id", id)
    .select("id");

  if (dbError) {
    return { error: traducirErrorDb(dbError, { duplicado: PATENTE_DUPLICADA(datos.patente) }), valores };
  }
  if (!data?.length) return { error: "No se encontró el vehículo.", valores };

  redirect(`/vehiculos/${id}`);
}

export async function eliminarVehiculo(id: string, clienteId: string): Promise<EstadoForm> {
  await obtenerSesion();
  const supabase = await createClient();

  const { data, error } = await supabase.from("vehiculos").delete().eq("id", id).select("id");

  if (error) {
    return {
      error: traducirErrorDb(error, {
        enUso: "No se puede eliminar el vehículo porque tiene órdenes de trabajo asociadas.",
      }),
    };
  }
  if (!data?.length) return { error: "No se pudo eliminar el vehículo." };

  redirect(`/clientes/${clienteId}`);
}
