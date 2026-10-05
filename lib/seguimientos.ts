import { createClient } from "@/lib/supabase/server";
import type { FilaSeguimiento } from "@/components/lista-seguimientos";

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

type FilaDb = {
  id: string;
  titulo: string;
  vence_en: string;
  hecha_en: string | null;
  asignado_a: string | null;
  orden_id: string | null;
  clientes: Uno<{ id: string; nombre: string; telefono: string | null }>;
  vehiculos: Uno<{ id: string; patente: string; marca: string | null; modelo: string | null }>;
};

export const SELECT_SEGUIMIENTO =
  "id, titulo, vence_en, hecha_en, asignado_a, orden_id, clientes(id, nombre, telefono), vehiculos(id, patente, marca, modelo)";

/** Convierte filas de la base al formato de ListaSeguimientos, con el nombre del asignado. */
export function aFilasSeguimiento(datos: unknown[] | null, nombres: Map<string, string>): FilaSeguimiento[] {
  return ((datos ?? []) as FilaDb[]).map((s) => ({
    id: s.id,
    titulo: s.titulo,
    vence_en: s.vence_en,
    hecha_en: s.hecha_en,
    orden_id: s.orden_id,
    asignado: s.asignado_a ? (nombres.get(s.asignado_a) ?? null) : null,
    cliente: uno(s.clientes),
    vehiculo: uno(s.vehiculos),
  }));
}

/** Seguimientos pendientes con filtros opcionales (cliente, vehículo, orden). */
export async function seguimientosPendientes(
  tallerId: string,
  filtro: { clienteId?: string; vehiculoId?: string; ordenId?: string; hasta?: string } = {},
) {
  const supabase = await createClient();
  let q = supabase
    .from("seguimientos")
    .select(SELECT_SEGUIMIENTO)
    .eq("taller_id", tallerId)
    .is("hecha_en", null)
    .order("vence_en")
    .limit(200);
  if (filtro.clienteId) q = q.eq("cliente_id", filtro.clienteId);
  if (filtro.vehiculoId) q = q.eq("vehiculo_id", filtro.vehiculoId);
  if (filtro.ordenId) q = q.eq("orden_id", filtro.ordenId);
  if (filtro.hasta) q = q.lte("vence_en", filtro.hasta);
  return q;
}
