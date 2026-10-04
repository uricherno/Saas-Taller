import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { formatoFecha, formatoKm, formatoPesos, labelTipo } from "@/lib/ordenes";
import BotonEliminar from "@/components/boton-eliminar";
import BotonImprimir from "@/components/boton-imprimir";
import EtiquetaEstado from "@/components/etiqueta-estado";
import FormItem from "@/components/form-item";
import { BotonLink, Volver } from "@/components/ui";
import { agregarItem, eliminarOrden, quitarItem } from "../actions";

export const metadata: Metadata = { title: "Orden de trabajo" };

type Item = {
  id: string;
  tipo: string;
  descripcion: string;
  cantidad: number | string;
  precio_unitario: number | string;
};

function subtotal(i: Pick<Item, "cantidad" | "precio_unitario">) {
  return Math.round(Number(i.cantidad) * Number(i.precio_unitario) * 100) / 100;
}

function formatoCantidad(c: number | string) {
  return Number(c).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export default async function OrdenPage({ params }: PageProps<"/ordenes/[id]">) {
  const { id } = await params;
  const { taller } = await obtenerSesion();
  const supabase = await createClient();

  const { data: orden } = await supabase
    .from("ordenes_trabajo")
    .select(
      `id, fecha, km_ingreso, descripcion, estado, total, proximo_service_fecha, proximo_service_km,
       vehiculos(id, patente, marca, modelo, anio, clientes(id, nombre, telefono)),
       items_orden(id, tipo, descripcion, cantidad, precio_unitario)`,
    )
    .eq("id", id)
    .order("tipo", { referencedTable: "items_orden", ascending: false }) // repuestos primero
    .maybeSingle();

  if (!orden) notFound();

  const vehiculo = Array.isArray(orden.vehiculos) ? orden.vehiculos[0] : orden.vehiculos;
  const cliente = vehiculo ? (Array.isArray(vehiculo.clientes) ? vehiculo.clientes[0] : vehiculo.clientes) : null;
  const items: Item[] = orden.items_orden ?? [];

  const totalRepuestos = items.filter((i) => i.tipo === "repuesto").reduce((a, i) => a + subtotal(i), 0);
  const totalManoObra = items.filter((i) => i.tipo !== "repuesto").reduce((a, i) => a + subtotal(i), 0);
  const titulo = orden.estado === "presupuestado" ? "Presupuesto" : "Orden de trabajo";
  const hayProximo = orden.proximo_service_fecha || orden.proximo_service_km;

  return (
    <div className="space-y-5">
      <div className="print:hidden">
        <Volver href={vehiculo ? `/vehiculos/${vehiculo.id}` : "/ordenes"}>
          {vehiculo ? vehiculo.patente : "Órdenes"}
        </Volver>
        <div className="flex flex-wrap gap-2">
          <BotonImprimir />
          <BotonLink href={`/ordenes/${id}/editar`} variante="secundario">
            Editar orden
          </BotonLink>
        </div>
      </div>

      {/* Documento: es lo que se imprime o se le muestra al cliente */}
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">{taller?.nombre}</p>
            <h1 className="text-2xl font-bold text-slate-900">{titulo}</h1>
            <p className="text-sm text-slate-500">Fecha: {formatoFecha(orden.fecha)}</p>
          </div>
          <EtiquetaEstado estado={orden.estado} />
        </header>

        <section className="grid grid-cols-1 gap-4 border-b border-slate-200 py-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Cliente</p>
            {cliente ? (
              <>
                <Link href={`/clientes/${cliente.id}`} className="font-medium text-slate-900 hover:underline print:no-underline">
                  {cliente.nombre}
                </Link>
                {cliente.telefono && <p className="text-sm text-slate-600">{cliente.telefono}</p>}
              </>
            ) : (
              <p className="text-slate-400">—</p>
            )}
          </div>
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Vehículo</p>
            {vehiculo && (
              <>
                <p className="font-mono font-semibold tracking-wider text-slate-900">{vehiculo.patente}</p>
                <p className="text-sm text-slate-600">
                  {[vehiculo.marca, vehiculo.modelo, vehiculo.anio].filter(Boolean).join(" · ")}
                </p>
              </>
            )}
            {orden.km_ingreso != null && (
              <p className="text-sm text-slate-600">Km de ingreso: {formatoKm(orden.km_ingreso)}</p>
            )}
          </div>
        </section>

        {orden.descripcion && (
          <section className="border-b border-slate-200 py-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Trabajo</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{orden.descripcion}</p>
          </section>
        )}

        <section className="py-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Detalle</p>
          {items.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay repuestos ni mano de obra cargados.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="hidden text-left text-xs text-slate-500 sm:table-header-group print:table-header-group">
                <tr className="border-b border-slate-200">
                  <th className="py-2 font-medium">Descripción</th>
                  <th className="py-2 text-right font-medium">Cant.</th>
                  <th className="py-2 text-right font-medium">P. unitario</th>
                  <th className="py-2 text-right font-medium">Subtotal</th>
                  <th className="w-8 print:hidden" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((i) => (
                  <tr key={i.id} className="align-top">
                    <td className="py-2 pr-2">
                      <span className="text-slate-900">{i.descripcion}</span>
                      <span className="block text-xs text-slate-500">
                        {labelTipo(i.tipo)}
                        {/* En celular, cantidad × precio debajo de la descripción */}
                        <span className="sm:hidden print:hidden">
                          {" "}· {formatoCantidad(i.cantidad)} × {formatoPesos(i.precio_unitario)}
                        </span>
                      </span>
                    </td>
                    <td className="hidden py-2 text-right whitespace-nowrap sm:table-cell print:table-cell">
                      {formatoCantidad(i.cantidad)}
                    </td>
                    <td className="hidden py-2 text-right whitespace-nowrap sm:table-cell print:table-cell">
                      {formatoPesos(i.precio_unitario)}
                    </td>
                    <td className="py-2 text-right font-medium whitespace-nowrap text-slate-900">
                      {formatoPesos(subtotal(i))}
                    </td>
                    <td className="py-1 pl-2 text-right print:hidden">
                      <form action={quitarItem.bind(null, i.id, id)}>
                        <button
                          type="submit"
                          aria-label={`Quitar ${i.descripcion}`}
                          title="Quitar"
                          className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <dl className="mt-4 ml-auto max-w-xs space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Repuestos</dt>
              <dd>{formatoPesos(totalRepuestos)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Mano de obra</dt>
              <dd>{formatoPesos(totalManoObra)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-lg font-bold text-slate-900">
              <dt>Total</dt>
              <dd>{formatoPesos(orden.total)}</dd>
            </div>
          </dl>
        </section>

        {hayProximo && (
          <section className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 print:border print:border-slate-300 print:bg-white print:text-slate-900">
            <p className="font-semibold">Próximo service</p>
            <p>
              {[
                orden.proximo_service_fecha && `el ${formatoFecha(orden.proximo_service_fecha)}`,
                orden.proximo_service_km && `a los ${formatoKm(orden.proximo_service_km)}`,
              ]
                .filter(Boolean)
                .join(" o ")}
              {orden.proximo_service_fecha && orden.proximo_service_km && ", lo que ocurra primero"}.
            </p>
          </section>
        )}
      </article>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <h2 className="font-semibold text-slate-900">Agregar repuesto o mano de obra</h2>
        <FormItem accion={agregarItem.bind(null, id)} />
      </section>

      <section className="border-t border-slate-200 pt-5 print:hidden">
        <BotonEliminar
          accion={eliminarOrden.bind(null, id, vehiculo?.id ?? "")}
          texto="Eliminar orden"
          pregunta="¿Seguro que querés eliminar esta orden y todos sus items?"
        />
      </section>
    </div>
  );
}
