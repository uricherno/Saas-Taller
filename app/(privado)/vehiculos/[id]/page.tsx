import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BotonEliminar from "@/components/boton-eliminar";
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
  const supabase = await createClient();

  const { data: v } = await supabase
    .from("vehiculos")
    .select("id, patente, marca, modelo, anio, km_actual, cliente_id, clientes(id, nombre, telefono)")
    .eq("id", id)
    .maybeSingle();

  if (!v) notFound();

  const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;

  // Historial: de la más reciente a la más antigua.
  const { data: historial } = await supabase
    .from("ordenes_trabajo")
    .select("id, fecha, estado, descripcion, total")
    .eq("vehiculo_id", id)
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false });
  const ordenes = historial ?? [];

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
          <BotonLink href={`/vehiculos/${id}/editar`} variante="secundario">
            Editar
          </BotonLink>
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
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Historial de órdenes</h2>
          <BotonLink href={`/vehiculos/${id}/ordenes/nueva`}>+ Nueva orden</BotonLink>
        </div>
        {ordenes.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">Este vehículo todavía no tiene órdenes.</Tarjeta>
        ) : (
          <ListaOrdenes ordenes={ordenes} />
        )}
      </section>

      <section className="border-t border-slate-200 pt-5">
        <BotonEliminar
          accion={eliminarVehiculo.bind(null, id, v.cliente_id)}
          texto="Eliminar vehículo"
          pregunta={`¿Seguro que querés eliminar el vehículo ${v.patente}?`}
        />
      </section>
    </div>
  );
}
