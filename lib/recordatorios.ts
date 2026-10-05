import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS_CERRADOS, formatoFecha, formatoKm, hoyISO } from "@/lib/ordenes";
import { aplicarPlantilla } from "@/lib/plantilla-recordatorio";

/** Avisar si el service vence dentro de estos días… */
export const DIAS_ANTICIPACION = 15;
/** …o si al vehículo le faltan estos km (o menos) para el service. */
export const KM_ANTICIPACION = 500;

export type VencimientoAviso = { id: string; tipo: string; fecha: string; avisadoEn: string | null };

export type Recordatorio = {
  /** Orden cuyo próximo service motiva el aviso (null si solo hay vencimientos). */
  ordenId: string | null;
  /** Hay motivo por service (fecha o km). */
  porService: boolean;
  /** VTV, seguro u otros vencimientos dentro de los próximos 15 días o vencidos. */
  vencimientos: VencimientoAviso[];
  vehiculo: {
    id: string;
    patente: string;
    marca: string | null;
    modelo: string | null;
    kmActual: number | null;
  };
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  /** Textos con el motivo: uno por fecha y/o uno por km. */
  motivos: string[];
  vencido: boolean;
  /** Avisado por todos sus motivos: fecha del aviso más reciente. null = pendiente. */
  enviadoEn: string | null;
  /** Último aviso por cualquier motivo (puede haber un motivo nuevo sin avisar). */
  ultimoAviso: string | null;
};

type FilaOrden = {
  id: string;
  vehiculo_id: string;
  fecha: string;
  proximo_service_fecha: string | null;
  proximo_service_km: number | null;
  recordatorio_enviado_en: string | null;
  vehiculos: unknown;
};

type FilaVehiculo = {
  id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  km_actual: number | null;
  clientes: unknown;
};

function uno<T>(x: unknown): T | null {
  return (Array.isArray(x) ? (x[0] ?? null) : (x ?? null)) as T | null;
}

/** Días entre dos fechas "YYYY-MM-DD" (b - a), sin problemas de zona horaria. */
function diasEntre(a: string, b: string) {
  const ms = Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const NOMBRE_VENCIMIENTO: Record<string, string> = { vtv: "VTV", seguro: "Seguro", otro: "Vencimiento" };

function plural(n: number, singular: string, pluralTxt: string) {
  return `${n} ${n === 1 ? singular : pluralTxt}`;
}

/**
 * Evalúa la última orden cerrada de un vehículo.
 * Devuelve null si no corresponde avisar todavía.
 */
export function evaluar(orden: FilaOrden, hoy: string): Recordatorio | null {
  const v = uno<FilaVehiculo>(orden.vehiculos);
  if (!v) return null;

  const motivos: string[] = [];
  let vencido = false;

  if (orden.proximo_service_fecha) {
    const dias = diasEntre(hoy, orden.proximo_service_fecha);
    const fecha = formatoFecha(orden.proximo_service_fecha);
    if (dias < 0) {
      vencido = true;
      motivos.push(`Por fecha: venció el ${fecha} (hace ${plural(-dias, "día", "días")})`);
    } else if (dias === 0) {
      vencido = true;
      motivos.push(`Por fecha: vence hoy (${fecha})`);
    } else if (dias <= DIAS_ANTICIPACION) {
      motivos.push(`Por fecha: vence el ${fecha} (en ${plural(dias, "día", "días")})`);
    }
  }

  if (orden.proximo_service_km != null && v.km_actual != null) {
    const faltan = orden.proximo_service_km - v.km_actual;
    const objetivo = formatoKm(orden.proximo_service_km);
    if (faltan <= 0) {
      vencido = true;
      motivos.push(
        faltan === 0
          ? `Por km: llegó a los ${objetivo}`
          : `Por km: pasó los ${objetivo} por ${formatoKm(-faltan)}`,
      );
    } else if (faltan <= KM_ANTICIPACION) {
      motivos.push(`Por km: tiene ${formatoKm(v.km_actual)}, faltan ${formatoKm(faltan)} para los ${objetivo}`);
    }
  }

  if (motivos.length === 0) return null;

  const c = uno<{ id: string; nombre: string; telefono: string | null }>(v.clientes);

  return {
    ordenId: orden.id,
    porService: true,
    vencimientos: [],
    vehiculo: { id: v.id, patente: v.patente, marca: v.marca, modelo: v.modelo, kmActual: v.km_actual },
    cliente: c ? { id: c.id, nombre: c.nombre, telefono: c.telefono } : null,
    motivos,
    vencido,
    enviadoEn: orden.recordatorio_enviado_en,
    ultimoAviso: orden.recordatorio_enviado_en,
  };
}

const PAGINA = 1000;

/**
 * Calcula los recordatorios del taller. Por cada vehículo se mira solo su última
 * orden terminada o entregada que tenga próximo service cargado (la más nueva por
 * fecha y, a igual fecha, por fecha de creación).
 */
export async function obtenerRecordatorios(
  tallerId: string,
): Promise<{ recordatorios: Recordatorio[]; error: PostgrestError | null }> {
  const supabase = await createClient();
  const filas: FilaOrden[] = [];

  // Traer en páginas por si el taller tiene muchas órdenes.
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("ordenes_trabajo")
      .select(
        `id, vehiculo_id, fecha, proximo_service_fecha, proximo_service_km, recordatorio_enviado_en,
         vehiculos(id, patente, marca, modelo, km_actual, clientes(id, nombre, telefono))`,
      )
      .eq("taller_id", tallerId)
      // Solo terminadas o entregadas (las canceladas nunca cuentan)…
      .in("estado", ESTADOS_CERRADOS)
      // …y que tengan cargado el próximo service por fecha o por km. Las que no
      // tienen ninguno se ignoran, así no "tapan" a una orden anterior que sí lo tiene.
      .or("proximo_service_fecha.not.is.null,proximo_service_km.not.is.null")
      .order("fecha", { ascending: false })
      .order("creado_en", { ascending: false })
      .order("id", { ascending: true })
      .range(desde, desde + PAGINA - 1);

    if (error) return { recordatorios: [], error };
    filas.push(...((data ?? []) as FilaOrden[]));
    if (!data || data.length < PAGINA) break;
  }

  const hoy = hoyISO();
  const vistos = new Set<string>();
  const porVehiculo = new Map<string, Recordatorio>();

  for (const orden of filas) {
    // Vienen ordenadas de la más nueva a la más vieja: la primera de cada vehículo es la última.
    if (vistos.has(orden.vehiculo_id)) continue;
    vistos.add(orden.vehiculo_id);

    const r = evaluar(orden, hoy);
    if (r) porVehiculo.set(orden.vehiculo_id, r);
  }

  // Vencimientos (VTV, seguro…) que vencen en 15 días o menos, o ya vencieron.
  const { data: vencs, error: errorVenc } = await supabase
    .from("vencimientos_vehiculo")
    .select("id, tipo, fecha, avisado_en, vehiculo_id, vehiculos(id, patente, marca, modelo, km_actual, clientes(id, nombre, telefono))")
    .eq("taller_id", tallerId)
    .lte("fecha", sumarDias(hoy, DIAS_ANTICIPACION))
    .order("fecha")
    .limit(2000);
  if (errorVenc) return { recordatorios: [], error: errorVenc };

  for (const x of vencs ?? []) {
    const v = uno<FilaVehiculo>(x.vehiculos);
    if (!v) continue;
    let r = porVehiculo.get(x.vehiculo_id);
    if (!r) {
      const c = uno<{ id: string; nombre: string; telefono: string | null }>(v.clientes);
      r = {
        ordenId: null,
        porService: false,
        vencimientos: [],
        vehiculo: { id: v.id, patente: v.patente, marca: v.marca, modelo: v.modelo, kmActual: v.km_actual },
        cliente: c,
        motivos: [],
        vencido: false,
        enviadoEn: null,
        ultimoAviso: null,
      };
      porVehiculo.set(x.vehiculo_id, r);
    }
    const dias = diasEntre(hoy, x.fecha);
    const nombre = NOMBRE_VENCIMIENTO[x.tipo] ?? "Vencimiento";
    r.vencimientos.push({ id: x.id, tipo: x.tipo, fecha: x.fecha, avisadoEn: x.avisado_en });
    if (dias <= 0) r.vencido = true;
    r.motivos.push(
      dias < 0
        ? `${nombre}: venció el ${formatoFecha(x.fecha)} (hace ${plural(-dias, "día", "días")})`
        : dias === 0
          ? `${nombre}: vence hoy`
          : `${nombre}: vence el ${formatoFecha(x.fecha)} (en ${plural(dias, "día", "días")})`,
    );
  }

  // Avisado = todos sus motivos tienen aviso registrado.
  const recordatorios = [...porVehiculo.values()].map((r) => {
    const avisos = [
      ...(r.porService ? [r.ultimoAviso] : []),
      ...r.vencimientos.map((x) => x.avisadoEn),
    ];
    const registrados = avisos.filter(Boolean) as string[];
    const ultimo = registrados.sort().at(-1) ?? null;
    return { ...r, ultimoAviso: ultimo, enviadoEn: registrados.length === avisos.length ? ultimo : null };
  });

  // Primero los vencidos, después por patente.
  recordatorios.sort(
    (a, b) => Number(b.vencido) - Number(a.vencido) || a.vehiculo.patente.localeCompare(b.vehiculo.patente),
  );

  return { recordatorios, error: null };
}

/** Pendientes = vencidos o próximos que todavía no fueron avisados. */
export function contarPendientes(recordatorios: Recordatorio[]) {
  return recordatorios.filter((r) => !r.enviadoEn).length;
}

const ARTICULO_VENCIMIENTO: Record<string, string> = { vtv: "la VTV", seguro: "el seguro", otro: "un vencimiento" };

/**
 * Mensaje del recordatorio: el texto configurado en /ajustes (o el de por defecto)
 * si hay motivo de service, más una frase por cada vencimiento (VTV, seguro).
 */
export function mensajeRecordatorio(r: Recordatorio, taller: string, plantilla: string | null | undefined) {
  const auto = [r.vehiculo.marca, r.vehiculo.modelo].filter(Boolean).join(" ") || "vehículo";
  const hoy = hoyISO();
  const frasesVenc = r.vencimientos.map((x) => {
    const que = ARTICULO_VENCIMIENTO[x.tipo] ?? "un vencimiento";
    return x.fecha < hoy ? `${que} venció el ${formatoFecha(x.fecha)}` : `${que} vence el ${formatoFecha(x.fecha)}`;
  });
  const vencTexto = frasesVenc.length ? frasesVenc.join(" y ") : "";

  if (r.porService) {
    const base = aplicarPlantilla(plantilla, {
      nombre: r.cliente?.nombre ?? "",
      taller,
      marca: r.vehiculo.marca,
      modelo: r.vehiculo.modelo,
      patente: r.vehiculo.patente,
    });
    return vencTexto ? `${base} Además, te recordamos que ${vencTexto}.` : base;
  }
  return (
    `Hola ${r.cliente?.nombre ?? ""}, te escribimos de ${taller}. ` +
    `Te recordamos que en tu ${auto} (${r.vehiculo.patente}) ${vencTexto}. ¿Querés que te ayudemos a coordinarlo?`
  );
}
