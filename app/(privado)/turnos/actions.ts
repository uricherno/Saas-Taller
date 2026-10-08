"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";
import { normalizarPatente } from "@/lib/patentes";
import { esEstadoTurno, inicioTurno } from "@/lib/turnos";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function crearTurno(_prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("turnos");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = {
    vehiculo_id: texto(formData, "vehiculo_id"),
    nombre_contacto: texto(formData, "nombre_contacto"),
    telefono: texto(formData, "telefono"),
    patente: texto(formData, "patente"),
    fecha: texto(formData, "fecha"),
    hora: texto(formData, "hora"),
    duracion_min: texto(formData, "duracion_min") || "60",
    motivo: texto(formData, "motivo"),
  };

  if (!FECHA_RE.test(valores.fecha)) return { error: "Elegí el día del turno.", valores };
  if (!HORA_RE.test(valores.hora)) return { error: "Elegí la hora del turno.", valores };
  const duracion = Number(valores.duracion_min);
  if (!Number.isInteger(duracion) || duracion < 5 || duracion > 1440) {
    return { error: "La duración no es válida.", valores };
  }
  if (valores.motivo.length > 500) return { error: "El motivo es demasiado largo.", valores };

  const supabase = await createClient();
  let datos: Record<string, unknown>;

  if (valores.vehiculo_id) {
    // Turno de un auto ya cargado: el cliente sale del vehículo.
    const { data: v } = await supabase
      .from("vehiculos")
      .select("id, cliente_id, patente")
      .eq("id", valores.vehiculo_id)
      .eq("taller_id", tallerId)
      .maybeSingle();
    if (!v) return { error: "No se encontró el vehículo.", valores };
    datos = { vehiculo_id: v.id, cliente_id: v.cliente_id, patente: v.patente };
  } else {
    if (!valores.nombre_contacto) return { error: "Escribí el nombre de quien pide el turno.", valores };
    if (valores.nombre_contacto.length > 200) return { error: "El nombre es demasiado largo.", valores };
    if (valores.telefono && !/^[\d\s+()-]{6,25}$/.test(valores.telefono)) {
      return { error: "El teléfono solo puede tener números, espacios, +, guiones o paréntesis.", valores };
    }
    const patente = valores.patente ? normalizarPatente(valores.patente) : "";
    if (patente.length > 15) return { error: "La patente no es válida.", valores };
    datos = {
      nombre_contacto: valores.nombre_contacto,
      telefono: valores.telefono || null,
      patente: patente || null,
    };
  }

  const { error } = await supabase.from("turnos").insert({
    taller_id: tallerId,
    ...datos,
    inicio: inicioTurno(valores.fecha, valores.hora),
    duracion_min: duracion,
    motivo: valores.motivo || null,
  });
  if (error) return { error: traducirErrorDb(error), valores };

  revalidatePath("/", "layout");
  redirect(`/turnos?semana=${valores.fecha}`);
}

export async function cambiarEstadoTurno(id: string, estado: string): Promise<{ error?: string }> {
  const { tallerId, sinPermiso } = await sesionCon("turnos");
  if (sinPermiso) return { error: SIN_PERMISO };
  if (!esEstadoTurno(estado)) return { error: "Estado no válido." };

  const supabase = await createClient();
  const { error } = await supabase.from("turnos").update({ estado }).eq("id", id).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };

  revalidatePath("/", "layout");
  return {};
}

export async function marcarTurnoRecordado(id: string): Promise<{ error?: string }> {
  const { tallerId, sinPermiso } = await sesionCon("turnos");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase
    .from("turnos")
    .update({ recordado_en: new Date().toISOString() })
    .eq("id", id)
    .eq("taller_id", tallerId);
  if (error) return { error: "Se abrió WhatsApp, pero no se pudo marcar el turno como recordado." };

  revalidatePath("/", "layout");
  return {};
}

export async function eliminarTurno(id: string): Promise<{ error?: string }> {
  const { tallerId, sinPermiso } = await sesionCon("borrar");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase.from("turnos").delete().eq("id", id).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };

  revalidatePath("/", "layout");
  return {};
}
