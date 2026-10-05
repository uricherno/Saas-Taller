import { createClient } from "@/lib/supabase/server";
import { calcularSegmento, type ResumenCliente, type Segmento } from "@/lib/crm";
import { hoyISO } from "@/lib/ordenes";

const PAGINA = 1000;

export type ResumenConSegmento = ResumenCliente & { cliente_id: string; segmento: Segmento };

/**
 * Visitas, total gastado y segmento de cada cliente del taller
 * (vista clientes_resumen, que respeta el RLS de quien consulta).
 */
export async function obtenerResumenes(tallerId: string): Promise<Map<string, ResumenConSegmento>> {
  const supabase = await createClient();
  const hoy = hoyISO();
  const mapa = new Map<string, ResumenConSegmento>();

  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("clientes_resumen")
      .select("cliente_id, visitas, total_gastado, primera_visita, ultima_visita")
      .eq("taller_id", tallerId)
      .order("cliente_id")
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    for (const r of data ?? []) mapa.set(r.cliente_id, { ...r, segmento: calcularSegmento(r, hoy) });
    if (!data || data.length < PAGINA) break;
  }
  return mapa;
}

export async function obtenerResumen(tallerId: string, clienteId: string): Promise<ResumenConSegmento | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clientes_resumen")
    .select("cliente_id, visitas, total_gastado, primera_visita, ultima_visita")
    .eq("taller_id", tallerId)
    .eq("cliente_id", clienteId)
    .maybeSingle();
  return data ? { ...data, segmento: calcularSegmento(data, hoyISO()) } : null;
}
