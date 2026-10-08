"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { decimal, texto, type EstadoForm } from "@/lib/formularios";
import { esMedioPago } from "@/lib/cobros";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function registrarPago(ordenId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, userId, sinPermiso } = await sesionCon("cobrar");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = {
    monto: texto(formData, "monto"),
    medio: texto(formData, "medio"),
    concepto: texto(formData, "concepto"),
    fecha: texto(formData, "fecha"),
    nota: texto(formData, "nota"),
  };

  const monto = decimal(valores.monto);
  if (monto === null || Number.isNaN(monto) || monto <= 0) {
    return { error: "El monto tiene que ser un número mayor a 0 (ej: 15000 o 15.000,50).", valores };
  }
  if (!esMedioPago(valores.medio)) return { error: "Elegí el medio de pago.", valores };
  if (valores.concepto !== "pago" && valores.concepto !== "sena") return { error: "Elegí si es seña o pago.", valores };
  if (!FECHA_RE.test(valores.fecha)) return { error: "Elegí la fecha del cobro.", valores };
  if (valores.nota.length > 300) return { error: "La nota es demasiado larga (máximo 300 caracteres).", valores };

  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select("id")
    .eq("id", ordenId)
    .eq("taller_id", tallerId)
    .maybeSingle();
  if (!orden) return { error: "No se encontró la orden.", valores };

  const { error } = await supabase.from("pagos").insert({
    taller_id: tallerId,
    orden_id: ordenId,
    monto,
    medio: valores.medio,
    concepto: valores.concepto,
    fecha: valores.fecha,
    nota: valores.nota || null,
    creado_por: userId,
  });
  if (error) return { error: traducirErrorDb(error), valores };

  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/cobros");
  return { exito: "Cobro registrado.", valores: { medio: valores.medio, fecha: valores.fecha, concepto: "pago" } };
}

export async function borrarPago(pagoId: string, ordenId: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("borrar");
  if (sinPermiso) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { data, error } = await supabase.from("pagos").delete().eq("id", pagoId).eq("taller_id", tallerId).select("id");
  if (error) return { error: traducirErrorDb(error) };
  if (!data?.length) return { error: "No se pudo borrar el cobro." };
  revalidatePath(`/ordenes/${ordenId}`);
  revalidatePath("/cobros");
  return {};
}
