// Reglas del CRM que no dependen de la base: segmentos, tipos de interacción,
// etiquetas. Sin imports de servidor (se usa también en componentes de cliente).

export const TIPOS_INTERACCION = [
  { valor: "nota", label: "Nota", icono: "📝" },
  { valor: "whatsapp", label: "WhatsApp", icono: "💬" },
  { valor: "llamada", label: "Llamada", icono: "📞" },
  { valor: "presupuesto", label: "Presupuesto", icono: "🧾" },
  { valor: "posventa", label: "Posventa", icono: "🔧" },
] as const;

export type TipoInteraccion = (typeof TIPOS_INTERACCION)[number]["valor"];

export function esTipoInteraccion(v: string): v is TipoInteraccion {
  return TIPOS_INTERACCION.some((t) => t.valor === v);
}

export function infoInteraccion(tipo: string) {
  return TIPOS_INTERACCION.find((t) => t.valor === tipo) ?? { valor: tipo, label: tipo, icono: "•" };
}

// ─── Segmentos ────────────────────────────────────────────────────────────

export const SEGMENTOS = [
  { valor: "nuevo", label: "Nuevo", color: "bg-sky-100 text-sky-800", descripcion: "Primera visita hace menos de 30 días" },
  { valor: "activo", label: "Activo", color: "bg-green-100 text-green-800", descripcion: "Última visita hace hasta 6 meses" },
  { valor: "en_riesgo", label: "En riesgo", color: "bg-amber-100 text-amber-800", descripcion: "Última visita hace 6 a 12 meses" },
  { valor: "inactivo", label: "Inactivo", color: "bg-red-100 text-red-700", descripcion: "Última visita hace más de 12 meses" },
  { valor: "sin_visitas", label: "Sin visitas", color: "bg-slate-100 text-slate-600", descripcion: "Todavía no tiene órdenes entregadas" },
] as const;

export type Segmento = (typeof SEGMENTOS)[number]["valor"];

export function esSegmento(v: string): v is Segmento {
  return SEGMENTOS.some((s) => s.valor === v);
}

export function infoSegmento(s: Segmento) {
  return SEGMENTOS.find((x) => x.valor === s)!;
}

/** "2026-10-05" menos n meses (si el día no existe en ese mes, usa el último). */
function restarMeses(fechaISO: string, meses: number) {
  const [a, m, d] = fechaISO.slice(0, 10).split("-").map(Number);
  const objetivo = new Date(Date.UTC(a, m - 1 - meses, 1));
  const ultimoDia = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(d, ultimoDia));
  return objetivo.toISOString().slice(0, 10);
}

function diasEntre(desdeISO: string, hastaISO: string) {
  return Math.round((Date.parse(hastaISO.slice(0, 10)) - Date.parse(desdeISO.slice(0, 10))) / 86_400_000);
}

export type ResumenCliente = {
  visitas: number;
  total_gastado: number | string;
  primera_visita: string | null;
  ultima_visita: string | null;
};

/**
 * Segmento según las órdenes entregadas:
 *  Nuevo: la primera visita fue hace menos de 30 días.
 *  Activo / En riesgo / Inactivo: según la última visita (≤6 meses / 6–12 / >12).
 */
export function calcularSegmento(r: ResumenCliente | null | undefined, hoy: string): Segmento {
  if (!r || !r.visitas || !r.ultima_visita || !r.primera_visita) return "sin_visitas";
  if (diasEntre(r.primera_visita, hoy) < 30) return "nuevo";
  if (r.ultima_visita >= restarMeses(hoy, 6)) return "activo";
  if (r.ultima_visita >= restarMeses(hoy, 12)) return "en_riesgo";
  return "inactivo";
}

export function ticketPromedio(r: ResumenCliente | null | undefined) {
  if (!r || !r.visitas) return 0;
  return Math.round((Number(r.total_gastado) / r.visitas) * 100) / 100;
}

// ─── Etiquetas y origen ───────────────────────────────────────────────────

export const ORIGENES_SUGERIDOS = ["Recomendación", "Google", "Instagram", "Facebook", "Pasó por la puerta", "Cliente de antes"];

/** "vip, Flota ,  vip" → ["vip", "flota"]: minúsculas, sin repetidos, sin vacías. */
export function normalizarEtiquetas(texto: string): string[] {
  const vistas = new Set<string>();
  for (const e of texto.split(",")) {
    const limpia = e.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 30);
    if (limpia) vistas.add(limpia);
  }
  return [...vistas].slice(0, 15);
}
