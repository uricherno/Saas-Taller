import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { hoyISO } from "@/lib/ordenes";
import { terminoBusquedaPatente } from "@/lib/patentes";
import FormOrden from "@/components/form-orden";
import { Tarjeta, Volver } from "@/components/ui";
import { crearOrden } from "../actions";

export const metadata: Metadata = { title: "Nueva orden" };

type Vehiculo = {
  id: string;
  patente: string;
  marca: string | null;
  modelo: string | null;
  km_actual: number | null;
  clientes: { nombre: string } | { nombre: string }[] | null;
};

function nombreCliente(v: Vehiculo) {
  const c = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
  return c?.nombre ?? "";
}

export default async function NuevaOrdenPage({ searchParams }: PageProps<"/ordenes/nueva">) {
  const { vehiculo: vehiculoId, q } = await searchParams;
  const { tallerId } = await obtenerSesion();
  const supabase = await createClient();

  // Paso 2: vehículo elegido → formulario de la orden.
  if (typeof vehiculoId === "string" && vehiculoId) {
    const { data: v } = await supabase
      .from("vehiculos")
      .select("id, patente, marca, modelo, km_actual, clientes(nombre)")
      .eq("id", vehiculoId)
      .eq("taller_id", tallerId)
      .maybeSingle<Vehiculo>();

    if (v) {
      return (
        <div className="mx-auto max-w-xl">
          <Volver href={`/vehiculos/${v.id}`}>{v.patente}</Volver>
          <h1 className="text-2xl font-bold text-slate-900">Nueva orden</h1>
          <p className="mb-4 text-sm text-slate-500">
            {[v.patente, [v.marca, v.modelo].filter(Boolean).join(" "), nombreCliente(v)].filter(Boolean).join(" · ")}
          </p>
          <Tarjeta>
            <FormOrden
              accion={crearOrden.bind(null, v.id)}
              // Sugerir el último km conocido del auto como km de ingreso.
              inicial={{ fecha: hoyISO(), km_ingreso: v.km_actual }}
              cancelarHref={`/vehiculos/${v.id}`}
              textoBoton="Crear y cargar items"
            />
          </Tarjeta>
        </div>
      );
    }
  }

  // Paso 1: elegir el vehículo buscando por patente.
  const termino = typeof q === "string" ? terminoBusquedaPatente(q) : "";
  const { data: vehiculos } = termino
    ? await supabase
        .from("vehiculos")
        .select("id, patente, marca, modelo, km_actual, clientes(nombre)")
        .eq("taller_id", tallerId)
        .ilike("patente", `%${termino}%`)
        .order("patente")
        .limit(20)
        .returns<Vehiculo[]>()
    : { data: [] as Vehiculo[] };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Volver href="/ordenes">Órdenes</Volver>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Nueva orden</h1>
        <p className="text-sm text-slate-500">Primero elegí el vehículo.</p>
      </div>

      <form className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={typeof q === "string" ? q : ""}
          placeholder="Patente (ej: AB123CD)"
          aria-label="Buscar vehículo por patente"
          autoFocus
          autoCapitalize="characters"
          autoComplete="off"
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 uppercase placeholder:text-slate-400 placeholder:normal-case focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Buscar
        </button>
      </form>

      {termino &&
        (vehiculos?.length ? (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {vehiculos.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/ordenes/nueva?vehiculo=${v.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-sm font-semibold tracking-wider text-slate-900">
                    {v.patente}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm text-slate-600">
                    {[[v.marca, v.modelo].filter(Boolean).join(" "), nombreCliente(v)].filter(Boolean).join(" · ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Tarjeta className="text-center text-sm text-slate-600">
            No hay vehículos con esa patente. Para cargar uno nuevo, entrá al{" "}
            <Link href="/clientes" className="font-medium text-blue-600 hover:underline">
              cliente
            </Link>{" "}
            y tocá “Agregar vehículo”.
          </Tarjeta>
        ))}
    </div>
  );
}
