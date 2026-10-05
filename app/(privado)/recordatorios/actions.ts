"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { faltaMigracion } from "@/lib/db-errores";

/**
 * Después de abrir WhatsApp: marca como avisados la orden (próximo service) y los
 * vencimientos del recordatorio, y deja la interacción en la ficha del cliente.
 */
export async function marcarRecordatorioEnviado(datos: {
  ordenId: string | null;
  vencimientoIds: string[];
  clienteId: string | null;
  vehiculoId: string;
  texto: string;
}): Promise<{ error?: string }> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const ahora = new Date().toISOString();

  const resultados = await Promise.all([
    datos.ordenId
      ? supabase
          .from("ordenes_trabajo")
          .update({ recordatorio_enviado_en: ahora })
          .eq("id", datos.ordenId)
          .eq("taller_id", tallerId)
      : null,
    datos.vencimientoIds.length
      ? supabase
          .from("vencimientos_vehiculo")
          .update({ avisado_en: ahora })
          .in("id", datos.vencimientoIds)
          .eq("taller_id", tallerId)
      : null,
    datos.clienteId
      ? supabase.from("interacciones").insert({
          taller_id: tallerId,
          cliente_id: datos.clienteId,
          vehiculo_id: datos.vehiculoId,
          tipo: "whatsapp",
          texto: `Recordatorio enviado: ${datos.texto}`.slice(0, 4000),
        })
      : null,
  ]);

  const error = resultados.find((r) => r?.error)?.error;
  if (error) {
    if (faltaMigracion(error)) return { error: "Falta correr la migración en Supabase." };
    return { error: "Se abrió WhatsApp, pero no se pudo registrar el aviso. Intentá de nuevo." };
  }

  revalidatePath("/", "layout");
  return {};
}
