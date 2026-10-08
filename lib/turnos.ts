// Agenda de turnos del taller. Argentina no tiene horario de verano: siempre UTC-3.

const ZONA = "America/Argentina/Buenos_Aires";

export const ESTADOS_TURNO = [
  { valor: "pendiente", label: "Pendiente", color: "bg-slate-100 text-slate-700" },
  { valor: "confirmado", label: "Confirmado", color: "bg-blue-100 text-blue-800" },
  { valor: "atendido", label: "Atendido", color: "bg-green-100 text-green-800" },
  { valor: "no_vino", label: "No vino", color: "bg-amber-100 text-amber-800" },
  { valor: "cancelado", label: "Cancelado", color: "bg-red-100 text-red-700" },
] as const;

export type EstadoTurno = (typeof ESTADOS_TURNO)[number]["valor"];

export function esEstadoTurno(v: string): v is EstadoTurno {
  return ESTADOS_TURNO.some((e) => e.valor === v);
}

export function infoEstadoTurno(v: string) {
  return ESTADOS_TURNO.find((e) => e.valor === v) ?? ESTADOS_TURNO[0];
}

export const DURACIONES = [
  { valor: "30", label: "30 minutos" },
  { valor: "60", label: "1 hora" },
  { valor: "120", label: "2 horas" },
  { valor: "240", label: "Medio día" },
  { valor: "480", label: "Todo el día" },
] as const;

/** "2026-10-08" + "09:30" → instante en hora argentina (ISO con -03:00). */
export function inicioTurno(fecha: string, hora: string) {
  return `${fecha}T${hora}:00-03:00`;
}

/** Fecha "YYYY-MM-DD" en hora argentina de un timestamp. */
export function fechaAR(iso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA }).format(new Date(iso));
}

/** "09:30" en hora argentina. */
export function horaAR(iso: string) {
  return new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

/** Suma días a una fecha "YYYY-MM-DD" (sin depender de la zona horaria del servidor). */
export function sumarDias(fecha: string, dias: number) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Lunes de la semana de esa fecha. */
export function lunesDe(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo
  return sumarDias(fecha, dia === 0 ? -6 : 1 - dia);
}

/** "jueves 8/10" */
export function nombreDia(fecha: string) {
  const dia = new Intl.DateTimeFormat("es-AR", { timeZone: "UTC", weekday: "long" }).format(new Date(`${fecha}T12:00:00Z`));
  const [, mes, d] = fecha.split("-");
  return `${dia} ${Number(d)}/${Number(mes)}`;
}

export function mensajeRecordatorioTurno(d: {
  nombre: string | null;
  taller: string;
  fecha: string;
  hora: string;
  patente?: string | null;
  hoy: string;
}) {
  const cuando =
    d.fecha === d.hoy ? "hoy" : d.fecha === sumarDias(d.hoy, 1) ? "mañana" : `el ${nombreDia(d.fecha)}`;
  return (
    `Hola${d.nombre ? ` ${d.nombre}` : ""}, te recordamos que ${cuando} a las ${d.hora} tenés turno en ${d.taller}` +
    `${d.patente ? ` para tu auto (${d.patente})` : ""}.` +
    `\nSi no podés venir, avisanos por acá. ¡Gracias!`
  );
}
