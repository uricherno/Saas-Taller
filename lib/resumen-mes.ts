import { createClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/ordenes";
import { sumarMontos } from "@/lib/cobros";

export type ResumenMes = {
  /** Suma de los totales de las órdenes terminadas o entregadas este mes. */
  facturacion: number;
  facturacionMesAnterior: number | null;
  terminadas: number;
  ticketPromedio: number | null;
  /** Órdenes en proceso + terminadas sin entregar. */
  enTaller: number;
  listosParaRetirar: number;
  /** Lo efectivamente cobrado este mes (null si falta la migración de cobros). */
  cobrado: number | null;
};

/** "2026-10" → inicio de ese mes en Argentina (UTC−3, sin horario de verano). */
function inicioDeMes(anioMes: string) {
  return `${anioMes}-01T00:00:00-03:00`;
}

function mesAnterior(anioMes: string) {
  const [a, m] = anioMes.split("-").map(Number);
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, "0")}`;
}

/** Resumen del mes en curso para /inicio. Devuelve null si falta la migración 20261010. */
export async function obtenerResumenMes(tallerId: string): Promise<ResumenMes | null> {
  const supabase = await createClient();
  const hoy = hoyISO();
  const mes = hoy.slice(0, 7);
  const desde = inicioDeMes(mes);
  const desdeAnterior = inicioDeMes(mesAnterior(mes));

  const [terminadas, anteriores, enTaller, pagos] = await Promise.all([
    supabase.from("ordenes_trabajo").select("total").eq("taller_id", tallerId).gte("terminada_en", desde).limit(5000),
    supabase
      .from("ordenes_trabajo")
      .select("total")
      .eq("taller_id", tallerId)
      .gte("terminada_en", desdeAnterior)
      .lt("terminada_en", desde)
      .limit(5000),
    supabase.from("ordenes_trabajo").select("estado").eq("taller_id", tallerId).in("estado", ["en_revision", "en_proceso", "terminado"]).limit(5000),
    supabase.from("pagos").select("monto").eq("taller_id", tallerId).gte("fecha", `${mes}-01`).lte("fecha", hoy).limit(5000),
  ]);

  if (terminadas.error) return null;

  const facturacion = sumarMontos(terminadas.data.map((o) => o.total));
  const cantidad = terminadas.data.length;
  const listos = (enTaller.data ?? []).filter((o) => o.estado === "terminado").length;

  return {
    facturacion,
    facturacionMesAnterior: anteriores.error ? null : sumarMontos(anteriores.data.map((o) => o.total)),
    terminadas: cantidad,
    ticketPromedio: cantidad ? Math.round((facturacion / cantidad) * 100) / 100 : null,
    enTaller: enTaller.data?.length ?? 0,
    listosParaRetirar: listos,
    cobrado: pagos.error ? null : sumarMontos(pagos.data.map((p) => p.monto)),
  };
}
