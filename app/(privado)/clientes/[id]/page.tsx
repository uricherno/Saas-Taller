import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { obtenerEquipo } from "@/lib/equipo";
import { obtenerResumen } from "@/lib/resumen-clientes";
import { aFilasSeguimiento, seguimientosPendientes } from "@/lib/seguimientos";
import { ticketPromedio } from "@/lib/crm";
import { formatoFecha, formatoPesos, hoyISO } from "@/lib/ordenes";
import BotonEliminar from "@/components/boton-eliminar";
import BotonWhatsapp from "@/components/boton-whatsapp";
import EtiquetaSegmento from "@/components/etiqueta-segmento";
import LineaTiempo, { type EventoLineaTiempo } from "@/components/linea-tiempo";
import ListaSeguimientos from "@/components/lista-seguimientos";
import { FormNota, NuevoSeguimiento } from "@/components/crm";
import { BotonLink, Tarjeta, Volver } from "@/components/ui";
import { eliminarCliente } from "../actions";

export const metadata: Metadata = { title: "Ficha de cliente" };

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold text-slate-900">{valor}</dd>
    </div>
  );
}

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const { tallerId, rol, taller } = await obtenerSesion();
  const puedeEditar = puede(rol, "editarClientes");
  const puedeContactar = puede(rol, "contactarClientes");
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre, telefono, notas, origen, etiquetas, vehiculos(id, patente, marca, modelo, anio)")
    .eq("id", id)
    .eq("taller_id", tallerId)
    .order("patente", { referencedTable: "vehiculos" })
    .maybeSingle();

  if (!cliente) notFound();

  const vehiculos: { id: string; patente: string; marca: string | null; modelo: string | null; anio: number | null }[] =
    cliente.vehiculos ?? [];
  const patentes = new Map(vehiculos.map((v) => [v.id, v.patente]));
  const idsVehiculos = vehiculos.map((v) => v.id);

  const [resumen, equipo, { data: ordenes }, { data: interacciones }, { data: seguimientos }, { data: pendientes }] =
    await Promise.all([
      obtenerResumen(tallerId, id),
      obtenerEquipo(tallerId),
      idsVehiculos.length
        ? supabase
            .from("ordenes_trabajo")
            .select("id, fecha, creado_en, estado, tipo_trabajo, descripcion, total, vehiculo_id")
            .eq("taller_id", tallerId)
            .in("vehiculo_id", idsVehiculos)
            .order("fecha", { ascending: false })
            .limit(200)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("interacciones")
        .select("id, tipo, texto, creado_en, creado_por, vehiculo_id")
        .eq("taller_id", tallerId)
        .eq("cliente_id", id)
        .order("creado_en", { ascending: false })
        .limit(200),
      supabase
        .from("seguimientos")
        .select("id, titulo, vence_en, hecha_en, creado_en, creado_por")
        .eq("taller_id", tallerId)
        .eq("cliente_id", id)
        .order("creado_en", { ascending: false })
        .limit(200),
      seguimientosPendientes(tallerId, { clienteId: id }),
    ]);

  const nombres = new Map(equipo.map((u) => [u.id, u.nombre]));

  // Línea de tiempo unificada, de lo más reciente a lo más antiguo.
  const eventos: EventoLineaTiempo[] = [
    ...(ordenes ?? []).map((o) => ({
      clase: "orden" as const,
      id: o.id,
      // Las órdenes tienen solo fecha: se ubican al mediodía de ese día.
      fecha: `${o.fecha}T12:00:00-03:00`,
      estado: o.estado,
      tipoTrabajo: o.tipo_trabajo,
      descripcion: o.descripcion,
      total: o.total,
      patente: patentes.get(o.vehiculo_id) ?? null,
    })),
    ...(interacciones ?? []).map((i) => ({
      clase: "interaccion" as const,
      id: i.id,
      fecha: i.creado_en,
      tipo: i.tipo,
      texto: i.texto,
      autor: i.creado_por ? (nombres.get(i.creado_por) ?? null) : null,
      patente: i.vehiculo_id ? (patentes.get(i.vehiculo_id) ?? null) : null,
    })),
    ...(seguimientos ?? []).map((s) => ({
      clase: "seguimiento" as const,
      id: s.id,
      fecha: s.hecha_en ?? s.creado_en,
      titulo: s.titulo,
      venceEn: s.vence_en,
      hecha: Boolean(s.hecha_en),
      autor: s.creado_por ? (nombres.get(s.creado_por) ?? null) : null,
    })),
  ].sort((a, b) => Date.parse(b.fecha) - Date.parse(a.fecha));

  const filasPendientes = aFilasSeguimiento(pendientes, nombres);
  const nombreTaller = taller?.nombre ?? "el taller";

  return (
    <div className="space-y-5">
      <Volver href="/clientes">Clientes</Volver>

      <Tarjeta>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold break-words text-slate-900">{cliente.nombre}</h1>
              {resumen && <EtiquetaSegmento segmento={resumen.segmento} />}
            </div>
            <p className="mt-1 text-slate-600">{cliente.telefono || "Sin teléfono"}</p>
            {(cliente.origen || cliente.etiquetas?.length > 0) && (
              <div className="mt-2 flex flex-wrap gap-1">
                {cliente.origen && (
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                    Nos conoció por: {cliente.origen}
                  </span>
                )}
                {(cliente.etiquetas as string[]).map((e) => (
                  <Link
                    key={e}
                    href={`/clientes?etiqueta=${encodeURIComponent(e)}`}
                    className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
                  >
                    #{e}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-start gap-2">
            {puedeContactar && (
              <BotonWhatsapp telefono={cliente.telefono} clienteId={id}>
                WhatsApp
              </BotonWhatsapp>
            )}
            {puedeEditar && (
              <BotonLink href={`/clientes/${id}/editar`} variante="secundario">
                Editar
              </BotonLink>
            )}
          </div>
        </div>
        {cliente.notas && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Notas</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-slate-600">{cliente.notas}</p>
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Dato label="Visitas" valor={resumen?.visitas ?? 0} />
          <Dato label="Total gastado" valor={formatoPesos(resumen?.total_gastado ?? 0)} />
          <Dato label="Ticket promedio" valor={formatoPesos(ticketPromedio(resumen))} />
          <Dato
            label="Última visita"
            valor={resumen?.ultima_visita ? formatoFecha(resumen.ultima_visita) : <span className="text-slate-400">—</span>}
          />
        </dl>
        <p className="mt-2 text-xs text-slate-500">Cuentan solo las órdenes entregadas (las canceladas no suman).</p>
      </Tarjeta>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Seguimientos pendientes</h2>
          {puedeContactar && (
            <NuevoSeguimiento clienteId={id} equipo={equipo.filter((u) => u.activo)} venceSugerido={hoyISO()} />
          )}
        </div>
        {filasPendientes.length === 0 ? (
          <p className="text-sm text-slate-500">No hay tareas pendientes con este cliente.</p>
        ) : (
          <ListaSeguimientos
            seguimientos={filasPendientes}
            taller={nombreTaller}
            puedeGestionar={puedeContactar}
            mostrarCliente={false}
          />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Vehículos</h2>
          {puedeEditar && <BotonLink href={`/clientes/${id}/vehiculos/nuevo`}>+ Agregar vehículo</BotonLink>}
        </div>

        {vehiculos.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">Este cliente todavía no tiene vehículos.</Tarjeta>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {vehiculos.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/vehiculos/${v.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-sm font-semibold tracking-wider text-slate-900">
                    {v.patente}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm text-slate-600">
                    {[v.marca, v.modelo, v.anio].filter(Boolean).join(" · ") || "Sin datos"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Historial</h2>
        <Tarjeta>
          <FormNota clienteId={id} soloNotas={!puedeContactar} />
        </Tarjeta>
        <Tarjeta>
          <LineaTiempo eventos={eventos} />
        </Tarjeta>
      </section>

      {puede(rol, "borrar") && (
        <section className="border-t border-slate-200 pt-5">
          <BotonEliminar
            accion={eliminarCliente.bind(null, id)}
            texto="Eliminar cliente"
            pregunta={`¿Seguro que querés eliminar a ${cliente.nombre}? También se borran sus notas y seguimientos.`}
          />
        </section>
      )}
    </div>
  );
}
