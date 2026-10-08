import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { obtenerEquipo } from "@/lib/equipo";
import { ESTADOS_ABIERTOS, hoyISO } from "@/lib/ordenes";
import { contarPendientes, obtenerRecordatorios } from "@/lib/recordatorios";
import { obtenerPresupuestosPendientes } from "@/lib/presupuestos-pendientes";
import { obtenerResumenes } from "@/lib/resumen-clientes";
import { aFilasSeguimiento, seguimientosPendientes } from "@/lib/seguimientos";
import { obtenerResumenMes, type ResumenMes } from "@/lib/resumen-mes";
import { formatoPesos } from "@/lib/ordenes";
import ListaOrdenes from "@/components/lista-ordenes";
import ListaPresupuestos from "@/components/lista-presupuestos";
import ListaSeguimientos from "@/components/lista-seguimientos";
import { Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Inicio" };

/** Tarjeta-contador del panel. `alerta` la resalta cuando hay algo para hacer. */
function Indicador({
  href,
  titulo,
  valor,
  detalle,
  alerta,
}: {
  href: string;
  titulo: string;
  valor: number | null;
  detalle: string;
  alerta: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col justify-between gap-2 rounded-2xl border p-4 shadow-sm transition ${
        alerta ? "border-amber-200 bg-amber-50 hover:bg-amber-100" : "border-slate-200 bg-white hover:bg-slate-50"
      }`}
    >
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      <p className={`text-3xl font-bold ${alerta ? "text-amber-700" : "text-slate-400"}`}>{valor ?? "—"}</p>
      <p className="text-xs text-slate-500">{detalle}</p>
    </Link>
  );
}

const NOMBRE_MES = new Intl.DateTimeFormat("es-AR", { month: "long", timeZone: "America/Argentina/Buenos_Aires" });

function Dato({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-700">{titulo}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{valor}</p>
      {detalle && <p className="mt-1 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}

/** Facturación, órdenes terminadas, ticket promedio y autos en el taller. */
function ResumenDelMes({ r, verFacturacion }: { r: ResumenMes; verFacturacion: boolean }) {
  const variacion =
    r.facturacionMesAnterior && r.facturacionMesAnterior > 0
      ? Math.round((r.facturacion / r.facturacionMesAnterior - 1) * 100)
      : null;
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">
        Resumen de {NOMBRE_MES.format(new Date())}
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {verFacturacion && (
          <Dato
            titulo="Facturación"
            valor={formatoPesos(r.facturacion)}
            detalle={
              [
                variacion != null && `${variacion >= 0 ? "+" : ""}${variacion} % vs. el mes pasado`,
                r.cobrado != null && `Cobrado: ${formatoPesos(r.cobrado)}`,
              ]
                .filter(Boolean)
                .join(" · ") || "Órdenes terminadas este mes"
            }
          />
        )}
        <Dato titulo="Órdenes terminadas" valor={String(r.terminadas)} detalle="Terminadas o entregadas este mes" />
        {verFacturacion && (
          <Dato
            titulo="Ticket promedio"
            valor={r.ticketPromedio == null ? "—" : formatoPesos(r.ticketPromedio)}
            detalle="Por orden terminada"
          />
        )}
        <Dato
          titulo="Autos en el taller"
          valor={String(r.enTaller)}
          detalle={r.listosParaRetirar ? `${r.listosParaRetirar} listos para retirar` : "En proceso"}
        />
      </div>
    </section>
  );
}

export default async function InicioPage() {
  const { usuario, taller, tallerId, rol } = await obtenerSesion();
  const supabase = await createClient();
  const hoy = hoyISO();
  const nombreTaller = taller?.nombre ?? "el taller";
  const puedeContactar = puede(rol, "contactarClientes");

  // Cada bloque falla por separado: si falta una migración, el resto del panel igual se ve.
  const [abiertas, recordatorios, presupuestos, resumenes, seguimientos, equipo, resumenMes, stockBajo] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select("id, fecha, estado, tipo_trabajo, descripcion, total, vehiculos(patente, marca, modelo, clientes(nombre))")
      .eq("taller_id", tallerId)
      .in("estado", ESTADOS_ABIERTOS)
      .order("fecha", { ascending: true }) // las más viejas primero: son las más urgentes
      .limit(50),
    obtenerRecordatorios(tallerId),
    obtenerPresupuestosPendientes(tallerId, 3),
    obtenerResumenes(tallerId).catch(() => null),
    seguimientosPendientes(tallerId, { hasta: hoy }),
    obtenerEquipo(tallerId),
    obtenerResumenMes(tallerId),
    supabase.from("precios_stock_bajo").select("id", { count: "exact", head: true }).eq("taller_id", tallerId),
  ]);

  const ordenes = abiertas.data ?? [];
  const recordatoriosPendientes = recordatorios.error ? null : contarPendientes(recordatorios.recordatorios);
  const segs = seguimientos.error ? null : aFilasSeguimiento(seguimientos.data, new Map(equipo.map((u) => [u.id, u.nombre])));
  const segsHoy = segs?.filter((s) => s.vence_en === hoy).length ?? 0;
  const segsVencidos = segs?.filter((s) => s.vence_en < hoy).length ?? 0;
  const segmentos = resumenes ? [...resumenes.values()].map((r) => r.segmento) : null;
  const enRiesgo = segmentos?.filter((s) => s === "en_riesgo").length ?? null;
  const inactivos = segmentos?.filter((s) => s === "inactivo").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">¡Hola, {usuario.nombre}!</h1>
        <p className="text-slate-600">
          Panel de <span className="font-semibold">{nombreTaller}</span>
        </p>
      </div>

      {resumenMes && <ResumenDelMes r={resumenMes} verFacturacion={puede(rol, "verFacturacion")} />}

      {!stockBajo.error && (stockBajo.count ?? 0) > 0 && (
        <Link
          href="/precios?stock=bajo"
          className="block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100"
        >
          <strong>Stock bajo:</strong> {stockBajo.count === 1 ? "1 repuesto llegó" : `${stockBajo.count} repuestos llegaron`} al mínimo. Ver cuáles →
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          href="/seguimientos?filtro=hoy"
          titulo="Seguimientos de hoy"
          valor={segs ? segsHoy : null}
          detalle={segsVencidos ? `Y ${segsVencidos} vencidos` : "Ninguno vencido"}
          alerta={segsHoy + segsVencidos > 0}
        />
        <Indicador
          href="/presupuestos"
          titulo="Presupuestos pendientes"
          valor={presupuestos.error ? null : presupuestos.total}
          detalle="Sin respuesta hace más de 3 días"
          alerta={presupuestos.total > 0}
        />
        <Indicador
          href="/recordatorios"
          titulo="Recordatorios pendientes"
          valor={recordatoriosPendientes}
          detalle="Service, VTV y seguro para avisar"
          alerta={(recordatoriosPendientes ?? 0) > 0}
        />
        <Indicador
          href="/reactivacion?filtro=en_riesgo"
          titulo="Clientes en riesgo"
          valor={enRiesgo}
          detalle={`6 a 12 meses sin venir · ${inactivos} inactivos`}
          alerta={(enRiesgo ?? 0) > 0}
        />
      </div>

      {segs && segs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Para hacer hoy</h2>
            <Link href="/seguimientos" className="text-sm font-medium text-blue-600 hover:underline">
              Ver todos
            </Link>
          </div>
          <ListaSeguimientos seguimientos={segs.slice(0, 8)} taller={nombreTaller} puedeGestionar={puedeContactar} />
        </section>
      )}

      {presupuestos.presupuestos.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Presupuestos sin respuesta</h2>
            <Link href="/presupuestos" className="text-sm font-medium text-blue-600 hover:underline">
              Ver todos ({presupuestos.total})
            </Link>
          </div>
          <ListaPresupuestos
            presupuestos={presupuestos.presupuestos}
            taller={nombreTaller}
            puedeContactar={puedeContactar}
            equipo={equipo.filter((u) => u.activo)}
          />
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Órdenes abiertas <span className="text-slate-400">({ordenes.length})</span>
          </h2>
          <Link href="/ordenes?estado=en_proceso" className="text-sm font-medium text-blue-600 hover:underline">
            Ver en proceso
          </Link>
        </div>
        {ordenes.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">No hay órdenes presupuestadas ni en proceso.</Tarjeta>
        ) : (
          <ListaOrdenes ordenes={ordenes} mostrarVehiculo />
        )}
      </section>
    </div>
  );
}
