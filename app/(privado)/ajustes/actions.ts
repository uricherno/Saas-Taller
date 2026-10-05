"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";
import { MAX_LARGO_PLANTILLA, PLANTILLA_POR_DEFECTO } from "@/lib/plantilla-recordatorio";

export async function guardarAjustes(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("ajustes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const valores = {
    nombre: texto(formData, "nombre"),
    telefono: texto(formData, "telefono"),
    mensaje_recordatorio: texto(formData, "mensaje_recordatorio"),
  };

  if (!valores.nombre) return { error: "El nombre del taller es obligatorio.", valores };
  if (valores.nombre.length > 120) return { error: "El nombre es demasiado largo.", valores };
  if (valores.telefono && !/^[\d\s+()-]{6,25}$/.test(valores.telefono)) {
    return { error: "El teléfono solo puede tener números, espacios, +, guiones o paréntesis.", valores };
  }
  if (valores.mensaje_recordatorio.length > MAX_LARGO_PLANTILLA) {
    return { error: `El mensaje puede tener hasta ${MAX_LARGO_PLANTILLA} caracteres.`, valores };
  }
  const desconocidas = [...valores.mensaje_recordatorio.matchAll(/\{([^}]*)\}/g)]
    .map((m) => m[1])
    .filter((v) => !["nombre", "taller", "marca", "modelo", "patente"].includes(v.toLowerCase()));
  if (desconocidas.length) {
    return {
      error: `Estas variables no existen: ${desconocidas.map((v) => `{${v}}`).join(", ")}. Usá {nombre}, {taller}, {marca}, {modelo} o {patente}.`,
      valores,
    };
  }

  // Si el mensaje quedó vacío o igual al de por defecto, se guarda NULL (= usar el de por defecto).
  const mensaje =
    valores.mensaje_recordatorio && valores.mensaje_recordatorio !== PLANTILLA_POR_DEFECTO
      ? valores.mensaje_recordatorio
      : null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("talleres")
    .update({ nombre: valores.nombre, telefono: valores.telefono || null, mensaje_recordatorio: mensaje })
    .eq("id", tallerId)
    .select("id");

  if (error) return { error: traducirErrorDb(error), valores };
  if (!data?.length) {
    // RLS no dejó modificar la fila: falta una política de update en talleres.
    return {
      error: "No se pudieron guardar los cambios: tu base no permite modificar los datos del taller (falta una política de RLS para actualizar talleres).",
      valores,
    };
  }

  revalidatePath("/", "layout"); // el nombre del taller aparece en el encabezado
  return { exito: "Ajustes guardados.", valores };
}
