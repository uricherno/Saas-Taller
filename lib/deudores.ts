import { createClient } from "@/lib/supabase/server";
import { ESTADOS_CERRADOS } from "@/lib/ordenes";
import { sumarMontos } from "@/lib/cobros";

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

export type OrdenAdeudada = {
  id: string;
  fecha: string;
  total: number;
  cobrado: number;
  saldo: number;
  patente: string | null;
  vehiculo: string;
};

export type Deudor = {
  cliente: { id: string; nombre: string; telefono: string | null };
  saldo: number;
  ordenes: OrdenAdeudada[];
};

/**
 * Clientes con saldo pendiente: órdenes terminadas o entregadas que no se
 * cobraron completas. Ordenados de mayor a menor deuda.
 */
export async function obtenerDeudores(tallerId: string) {
  const supabase = await createClient();
  const { data: saldos, error } = await supabase
    .from("ordenes_saldo")
    .select("orden_id, total, cobrado, saldo")
    .eq("taller_id", tallerId)
    .in("estado", ESTADOS_CERRADOS)
    .gt("saldo", 0)
    .limit(1000);
  if (error) return { error, deudores: [] as Deudor[], total: 0 };
  if (!saldos.length) return { error: null, deudores: [] as Deudor[], total: 0 };

  const { data: ordenes, error: errorOrdenes } = await supabase
    .from("ordenes_trabajo")
    .select("id, fecha, vehiculos(patente, marca, modelo, clientes(id, nombre, telefono))")
    .eq("taller_id", tallerId)
    .in("id", saldos.map((s) => s.orden_id));
  if (errorOrdenes) return { error: errorOrdenes, deudores: [] as Deudor[], total: 0 };

  type Fila = {
    id: string;
    fecha: string;
    vehiculos: Uno<{ patente: string; marca: string | null; modelo: string | null; clientes: Uno<{ id: string; nombre: string; telefono: string | null }> }>;
  };
  const porOrden = new Map(((ordenes ?? []) as Fila[]).map((o) => [o.id, o]));
  const porCliente = new Map<string, Deudor>();

  for (const s of saldos) {
    const o = porOrden.get(s.orden_id);
    const v = o ? uno(o.vehiculos) : null;
    const c = v ? uno(v.clientes) : null;
    if (!o || !c) continue;
    const d = porCliente.get(c.id) ?? { cliente: c, saldo: 0, ordenes: [] };
    d.ordenes.push({
      id: o.id,
      fecha: o.fecha,
      total: Number(s.total),
      cobrado: Number(s.cobrado),
      saldo: Number(s.saldo),
      patente: v?.patente ?? null,
      vehiculo: [v?.marca, v?.modelo].filter(Boolean).join(" "),
    });
    d.saldo = sumarMontos([d.saldo, s.saldo]);
    porCliente.set(c.id, d);
  }

  const deudores = [...porCliente.values()].sort((a, b) => b.saldo - a.saldo);
  for (const d of deudores) d.ordenes.sort((a, b) => a.fecha.localeCompare(b.fecha));
  return { error: null, deudores, total: sumarMontos(deudores.map((d) => d.saldo)) };
}
