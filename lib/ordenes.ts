// Valores tal como se guardan en la base. Si tu tabla usa otros textos,
// cambialos solo acá.
export const ESTADOS = [
  { valor: "presupuestado", label: "Presupuestado", color: "bg-amber-100 text-amber-800" },
  { valor: "en_proceso", label: "En proceso", color: "bg-blue-100 text-blue-800" },
  { valor: "terminado", label: "Terminado", color: "bg-green-100 text-green-800" },
  { valor: "entregado", label: "Entregado", color: "bg-slate-200 text-slate-700" },
] as const;

export type Estado = (typeof ESTADOS)[number]["valor"];

export const ESTADOS_ABIERTOS: Estado[] = ["presupuestado", "en_proceso"];
export const ESTADOS_CERRADOS: Estado[] = ["terminado", "entregado"];

export const TIPOS_ITEM = [
  { valor: "repuesto", label: "Repuesto" },
  { valor: "mano_de_obra", label: "Mano de obra" },
] as const;

export type TipoItem = (typeof TIPOS_ITEM)[number]["valor"];

export function esEstado(v: string): v is Estado {
  return ESTADOS.some((e) => e.valor === v);
}

export function esTipoItem(v: string): v is TipoItem {
  return TIPOS_ITEM.some((t) => t.valor === v);
}

export function infoEstado(v: string) {
  return ESTADOS.find((e) => e.valor === v) ?? { valor: v, label: v, color: "bg-slate-100 text-slate-700" };
}

export function labelTipo(v: string) {
  return TIPOS_ITEM.find((t) => t.valor === v)?.label ?? v;
}

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 15000.5 → "$ 15.000,50" */
export function formatoPesos(monto: number | string | null | undefined) {
  return pesos.format(Number(monto ?? 0));
}

/** "2026-10-04" → "04/10/2026" (sin pasar por zonas horarias). */
export function formatoFecha(fecha: string | null | undefined) {
  if (!fecha) return "";
  const [a, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function formatoKm(km: number | null | undefined) {
  return km == null ? "" : `${km.toLocaleString("es-AR")} km`;
}

/** Fecha de hoy en Argentina, formato YYYY-MM-DD (para inputs type="date"). */
export function hoyISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(new Date());
}
