"use server";

import { createClient } from "@/lib/supabase/server";
import { texto, type EstadoForm } from "@/lib/formularios";
import { MENSAJES_RESERVA } from "@/lib/reservas";

/** El cliente (sin cuenta) pide un turno. La base valida el código, el horario y que esté libre. */
export async function reservarTurnoPublico(codigo: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const valores = {
    inicio: texto(formData, "inicio"),
    nombre: texto(formData, "nombre"),
    telefono: texto(formData, "telefono"),
    patente: texto(formData, "patente"),
    motivo: texto(formData, "motivo"),
  };
  if (!valores.inicio) return { error: "Elegí un día y un horario.", valores };
  if (!valores.nombre) return { error: "Escribí tu nombre.", valores };
  if (valores.telefono.replace(/\D/g, "").length < 8) return { error: "Escribí un teléfono válido (con código de área).", valores };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reservar_turno", {
    p_codigo: codigo,
    p_inicio: valores.inicio,
    p_nombre: valores.nombre,
    p_telefono: valores.telefono,
    p_patente: valores.patente || null,
    p_motivo: valores.motivo || null,
  });
  if (error) {
    console.error("[reservas] Error al reservar:", error);
    return { error: "No se pudo pedir el turno. Probá de nuevo en un rato.", valores };
  }
  if (data !== "ok") return { error: MENSAJES_RESERVA[String(data)] ?? MENSAJES_RESERVA.no_disponible, valores: { ...valores, inicio: "" } };
  return { exito: valores.inicio };
}
