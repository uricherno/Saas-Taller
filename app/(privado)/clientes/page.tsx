import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { BotonLink, Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Clientes" };

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const { q } = await searchParams;
  const busqueda = typeof q === "string" ? q.trim() : "";

  const supabase = await createClient();
  let query = supabase
    .from("clientes")
    .select("id, nombre, telefono, vehiculos(count)")
    .order("nombre")
    .limit(200);

  if (busqueda) {
    // Quitar caracteres que rompen la sintaxis del filtro de PostgREST.
    const termino = busqueda.replace(/[,()*%\\]/g, " ").trim();
    if (termino) query = query.or(`nombre.ilike.*${termino}*,telefono.ilike.*${termino}*`);
  }

  const { data: clientes, error } = await query;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        <BotonLink href="/clientes/nuevo">+ Nuevo cliente</BotonLink>
      </div>

      <form role="search" className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={busqueda}
          placeholder="Buscar por nombre o teléfono"
          aria-label="Buscar por nombre o teléfono"
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Buscar
        </button>
      </form>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar los clientes. Recargá la página.
        </p>
      ) : !clientes?.length ? (
        <Tarjeta className="text-center">
          {busqueda ? (
            <>
              <p className="text-slate-600">No hay clientes que coincidan con “{busqueda}”.</p>
              <Link href="/clientes" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:underline">
                Ver todos
              </Link>
            </>
          ) : (
            <p className="text-slate-600">Todavía no cargaste clientes. Empezá con “Nuevo cliente”.</p>
          )}
        </Tarjeta>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {clientes.map((c) => {
            const autos = c.vehiculos?.[0]?.count ?? 0;
            return (
              <li key={c.id}>
                <Link
                  href={`/clientes/${c.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">{c.nombre}</p>
                    <p className="truncate text-sm text-slate-500">{c.telefono || "Sin teléfono"}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {autos} {autos === 1 ? "vehículo" : "vehículos"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
