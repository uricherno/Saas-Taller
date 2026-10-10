// Reservas online: horario de atención del taller y horarios libres para la página pública.
// Argentina no tiene horario de verano: siempre UTC-3.

// Import relativo con extensión: así lo pueden usar también los tests (node --test).
import { inicioTurno, sumarDias } from "./turnos.ts";

export type Horario = { dias: number[]; desde: string; hasta: string; duracion: number };

export const HORARIO_POR_DEFECTO: Horario = { dias: [1, 2, 3, 4, 5], desde: "08:00", hasta: "17:00", duracion: 60 };

/** Lunes = 1 … domingo = 7 (como isodow de Postgres). */
export const DIAS_SEMANA = [
  { valor: 1, label: "Lun" },
  { valor: 2, label: "Mar" },
  { valor: 3, label: "Mié" },
  { valor: 4, label: "Jue" },
  { valor: 5, label: "Vie" },
  { valor: 6, label: "Sáb" },
  { valor: 7, label: "Dom" },
] as const;

export const DURACIONES_RESERVA = [
  { valor: "30", label: "Cada 30 minutos" },
  { valor: "60", label: "Cada 1 hora" },
  { valor: "90", label: "Cada 1 hora y media" },
  { valor: "120", label: "Cada 2 horas" },
] as const;

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function minutos(hora: string) {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

function aHora(min: number) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** Lee el horario guardado en la base; si algo no cierra, usa el de por defecto. */
export function leerHorario(valor: unknown): Horario {
  const h = (valor ?? {}) as Partial<Horario>;
  const dias = Array.isArray(h.dias) ? h.dias.filter((d) => Number.isInteger(d) && d >= 1 && d <= 7) : [];
  const desde = typeof h.desde === "string" && HORA_RE.test(h.desde) ? h.desde : HORARIO_POR_DEFECTO.desde;
  const hasta = typeof h.hasta === "string" && HORA_RE.test(h.hasta) ? h.hasta : HORARIO_POR_DEFECTO.hasta;
  const duracion = Number.isInteger(h.duracion) && h.duracion! >= 15 && h.duracion! <= 240 ? h.duracion! : 60;
  return { dias, desde, hasta, duracion };
}

/** Valida el horario que carga el dueño. Devuelve el error o null. */
export function validarHorario(h: Horario): string | null {
  if (!h.dias.length) return "Elegí al menos un día de atención.";
  if (!HORA_RE.test(h.desde) || !HORA_RE.test(h.hasta)) return "Los horarios no son válidos.";
  if (minutos(h.hasta) - minutos(h.desde) < h.duracion) return "El horario de cierre tiene que ser después del de apertura.";
  return null;
}

/** Día de la semana (1 = lunes … 7 = domingo) de una fecha "YYYY-MM-DD". */
function diaSemana(fecha: string) {
  const d = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
}

/**
 * Horarios libres de los próximos `dias` días. `ocupados` son los inicios de los
 * turnos ya dados (ISO). No ofrece horarios a menos de 1 hora de `ahora`.
 */
export function horariosLibres(
  horario: Horario,
  ocupados: string[],
  hoy: string,
  ahora: Date,
  dias = 14,
): { fecha: string; horas: { hora: string; inicio: string }[] }[] {
  const tomados = new Set(ocupados.map((o) => new Date(o).getTime()));
  const limite = ahora.getTime() + 60 * 60 * 1000;
  const resultado: { fecha: string; horas: { hora: string; inicio: string }[] }[] = [];

  for (let i = 0; i < dias; i++) {
    const fecha = sumarDias(hoy, i);
    if (!horario.dias.includes(diaSemana(fecha))) continue;
    const horas: { hora: string; inicio: string }[] = [];
    for (let m = minutos(horario.desde); m + horario.duracion <= minutos(horario.hasta); m += horario.duracion) {
      const hora = aHora(m);
      const inicio = inicioTurno(fecha, hora);
      const t = new Date(inicio).getTime();
      if (t >= limite && !tomados.has(t)) horas.push({ hora, inicio });
    }
    if (horas.length) resultado.push({ fecha, horas });
  }
  return resultado;
}

export const MENSAJES_RESERVA: Record<string, string> = {
  no_disponible: "Las reservas online de este taller no están disponibles. Comunicate con el taller.",
  datos: "Revisá los datos: falta el nombre o el teléfono no es válido.",
  fuera_de_horario: "Ese horario no está disponible. Elegí otro.",
  ocupado: "Ese horario se acaba de ocupar. Elegí otro.",
  limite: "Ya tenés turnos pedidos con ese teléfono. Si necesitás cambiarlos, comunicate con el taller.",
};
