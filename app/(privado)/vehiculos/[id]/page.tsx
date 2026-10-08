import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { obtenerEquipo } from "@/lib/equipo";
import { aFilasSeguimiento, seguimientosPendientes } from "@/lib/seguimientos";
import { formatoFecha, hoyISO } from "@/lib/ordenes";
import BotonEliminar from "@/components/boton-eliminar";
import ListaSeguimientos from "@/components/lista-seguimientos";
import { BotonBorrarVencimiento, FormNota, FormVencimiento, NuevoSeguimiento } from "@/components/crm";
import ListaOrdenes from "@/components/lista-ordenes";
import { BotonLink, Tarjeta, Volver } from "@/components/ui";
import { eliminarVehiculo } from "../actions";

export const metadata: Metadata = { title: "Vehículo" };

function Dato({ label, valor }: { label: string; valor: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</dt>
      <dd className="mt-0.5 text-slate-900">{valor ?? <span className="text-slate-400">—</span>}</dd>
    </div>
  );
}

export default async function VehiculoPage({ params }: PageProps<"/vehiculos/[id]">) {
  const { id } = await params;
  const { tallerId, rol, taller } = await obtenerSesion();
  const puedeContactar = puede(rol, "contactarClientes");
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("vehiculos")
    .select("id, patente, marca, modelo, anio, km_actual, cliente_id, clientes(id, nombre, telefono)")
    .eq("id", id)
    .eq("taller_id", tallerId)
    .maybeSingle();

  if (!v) notFound();

  const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;

  // Historial: de la más reciente a la más antigua.
  const { data: historial, error: errorHistorial } = await supabase
    .from("ordenes_trabajo")
    .select("id, fecha, estado, tipo_trabajo, descripcion, total")
    .eq("vehiculo_id", id)
    .eq("taller_id", tallerId)
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  const ordenes = historial ?? [];

  const [{ data: vencimientos }, { data: pendientes }, equipo] = await Promise.all([
    supabase
      .from("vencimientos_vehiculo")
      .select("id, tipo, fecha, nota, avisado_en")
      .eq("taller_id", tallerId)
      .eq("vehiculo_id", id)
      .order("fecha"),
    seguimientosPendientes(tallerId, { vehiculoId: id }),
    obtenerEquipo(tallerId),
  ]);
  const hoy = hoyISO();
  const nombres = new Map(equipo.map((u) => [u.id, u.nombre]));
  const etiquetaVencimiento = { vtv: "VTV", seguro: "Seguro", otro: "Otro" } as Record<string, string>;

  return (
    <div className="space-y-5">
      <Volver href={`/clientes/${v.cliente_id}`}>{cliente?.nombre ?? "Cliente"}</Volver>

      <Tarjeta>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-block rounded-lg border-2 border-slate-800 bg-white px-3 py-1 font-mono text-2xl font-bold tracking-widest text-slate-900">
              {v.patente}
            </span>
            <p className="mt-2 text-slate-600">
              {[v.marca, v.modelo].filter(Boolean).join(" ") || "Marca y modelo sin cargar"}
            </p>
          </div>
          {puede(rol, "editarClientes") && (
            <BotonLink href={`/vehiculos/${id}/editar`} variante="secundario">
              Editar
            </BotonLink>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 sm:grid-cols-4">
          <Dato label="Marca" valor={v.marca} />
          <Dato label="Modelo" valor={v.modelo} />
          <Dato label="Año" valor={v.anio} />
          <Dato
            label="Kilometraje"
            valor={v.km_actual != null ? `${v.km_actual.toLocaleString("es-AR")} km` : null}
          />
        </dl>
      </Tarjeta>

      {cliente && (
        <Tarjeta>
          <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Dueño</p>
          <Link href={`/clientes/${cliente.id}`} className="mt-1 block font-medium text-blue-600 hover:underline">
            {cliente.nombre}
          </Link>
          {cliente.telefono && <p className="text-sm text-slate-600">{cliente.telefono}</p>}
        </Tarjeta>
      )}

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Vencimientos</h2>
          {puedeContactar && <FormVencimiento vehiculoId={id} />}
        </div>
        {!vencimientos?.length ? (
          <p className="text-sm text-slate-500">Sin VTV ni seguro cargados. Se avisan en Recordatorios 15 días antes.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {vencimientos.map((x) => {
              const vencido = x.fecha < hoy;
              return (
                <li key={x.id} className="flex items-start justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {etiquetaVencimiento[x.tipo] ?? x.tipo}{" "}
                      <span className={`text-sm font-normal ${vencido ? "text-red-600" : "text-slate-500"}`}>
                        {vencido ? "venció el" : "vence el"} {formatoFecha(x.fecha)}
                      </span>
                    </p>
                    {x.nota && <p className="text-sm text-slate-600">{x.nota}</p>}
                    {x.avisado_en && <p className="text-xs text-slate-500">Cliente avisado</p>}
                  </div>
                  {puede(rol, "borrar") && <BotonBorrarVencimiento id={x.id} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Seguimientos</h2>
          {puedeContactar && (
            <NuevoSeguimiento
              clienteId={v.cliente_id}
              vehiculoId={id}
              equipo={equipo.filter((u) => u.activo)}
              venceSugerido={hoy}
            />
          )}
        </div>
        {!pendientes?.length ? (
          <p className="text-sm text-slate-500">No hay tareas pendientes con este vehículo.</p>
        ) : (
          <ListaSeguimientos
            seguimientos={aFilasSeguimiento(pendientes, nombres)}
            taller={taller?.nombre ?? "el taller"}
            puedeGestionar={puedeContactar}
            mostrarCliente={false}
          />
        )}
        <Tarjeta>
          <p className="mb-2 text-sm font-medium text-slate-700">Agregar una nota sobre este vehículo</p>
          <FormNota clienteId={v.cliente_id} vehiculoId={id} soloNotas={!puedeContactar} />
          <p className="mt-2 text-xs text-slate-500">Queda en el historial del cliente.</p>
        </Tarjeta>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Historial de órdenes</h2>
          <div className="flex flex-wrap gap-2">
            {puede(rol, "turnos") && (
              <BotonLink href={`/turnos/nuevo?vehiculo=${id}`} variante="secundario">
                Dar turno
              </BotonLink>
            )}
            <BotonLink href={`/ordenes/nueva?vehiculo=${id}`}>+ Nueva orden</BotonLink>
          </div>
        </div>
        {errorHistorial ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {faltaMigracion(errorHistorial) ? MENSAJE_FALTA_MIGRACION : "No se pudo cargar el historial."}
          </p>
        ) : ordenes.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">Este vehículo todavía no tiene órdenes.</Tarjeta>
        ) : (
          <ListaOrdenes ordenes={ordenes} />
        )}
      </section>

      {puede(rol, "borrar") && (
        <section className="border-t border-slate-200 pt-5">
          <BotonEliminar
            accion={eliminarVehiculo.bind(null, id, v.cliente_id)}
            texto="Eliminar vehículo"
            pregunta={`¿Seguro que querés eliminar el vehículo ${v.patente}?`}
          />
        </section>
      )}
    </div>
  );
}
