import { createClient } from "@/lib/supabase/server";
import { formatoPesos, hoyISO } from "@/lib/ordenes";

/** Un presupuesto se considera "pendiente" si sigue presupuestado después de estos días. */
export const DIAS_PRESUPUESTO_PENDIENTE = 3;

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

export type PresupuestoPendiente = {
  id: string;
  fecha: string;
  dias: number;
  total: number | string | null;
  descripcion: string | null;
  vehiculo: { id: string; patente: string; marca: string | null; modelo: string | null } | null;
  cliente: { id: string; nombre: string; telefono: string | null } | null;
};

function restarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - dias);
  return d.toISOString().slice(0, 10);
}

/** Órdenes en estado "presupuestado" con más de 3 días, de la más vieja a la más nueva. */
export async function obtenerPresupuestosPendientes(tallerId: string, limite = 200) {
  const supabase = await createClient();
  const hoy = hoyISO();
  const { data, error, count } = await supabase
    .from("ordenes_trabajo")
    .select(
      "id, fecha, total, descripcion, vehiculos(id, patente, marca, modelo, clientes(id, nombre, telefono))",
      { count: "exact" },
    )
    .eq("taller_id", tallerId)
    .eq("estado", "presupuestado")
    .lt("fecha", restarDias(hoy, DIAS_PRESUPUESTO_PENDIENTE))
    .order("fecha")
    .limit(limite);

  type Fila = {
    id: string;
    fecha: string;
    total: number | string | null;
    descripcion: string | null;
    vehiculos: Uno<{ id: string; patente: string; marca: string | null; modelo: string | null; clientes: Uno<{ id: string; nombre: string; telefono: string | null }> }>;
  };

  const presupuestos: PresupuestoPendiente[] = ((data ?? []) as Fila[]).map((o) => {
    const v = uno(o.vehiculos);
    return {
      id: o.id,
      fecha: o.fecha,
      dias: Math.round((Date.parse(hoy) - Date.parse(o.fecha)) / 86_400_000),
      total: o.total,
      descripcion: o.descripcion,
      vehiculo: v ? { id: v.id, patente: v.patente, marca: v.marca, modelo: v.modelo } : null,
      cliente: v ? uno(v.clientes) : null,
    };
  });

  return { presupuestos, total: count ?? presupuestos.length, error };
}

export function mensajePresupuestoPendiente(p: PresupuestoPendiente, taller: string) {
  const auto = [p.vehiculo?.marca, p.vehiculo?.modelo].filter(Boolean).join(" ") || "vehículo";
  return (
    `Hola ${p.cliente?.nombre ?? ""}, te escribimos de ${taller}. ` +
    `¿Pudiste ver el presupuesto para tu ${auto}${p.vehiculo ? ` (${p.vehiculo.patente})` : ""} por ${formatoPesos(p.total)}? ` +
    `Si te parece bien, coordinamos el turno.`
  );
}
