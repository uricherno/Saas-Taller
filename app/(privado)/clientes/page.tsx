import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { esSegmento, SEGMENTOS } from "@/lib/crm";
import { obtenerResumenes } from "@/lib/resumen-clientes";
import EtiquetaSegmento from "@/components/etiqueta-segmento";
import { BotonLink, Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Clientes" };

const MAX_CLIENTES = 1000;

type Fila = {
  id: string;
  nombre: string;
  telefono: string | null;
  origen: string | null;
  etiquetas: string[] | null;
  vehiculos: { count: number }[];
};

const ESTILO_SELECT =
  "rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:outline-none";

export default async function ClientesPage({ searchParams }: PageProps<"/clientes">) {
  const sp = await searchParams;
  const param = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).trim() : "");
  const busqueda = param("q");
  const segmento = esSegmento(param("segmento")) ? param("segmento") : "";
  const etiqueta = param("etiqueta");
  const origen = param("origen");

  const { tallerId, rol } = await obtenerSesion();
  const puedeEditar = puede(rol, "editarClientes");
  const supabase = await createClient();

  let query = supabase
    .from("clientes")
    .select("id, nombre, telefono, origen, etiquetas, vehiculos(count)")
    .eq("taller_id", tallerId)
    .order("nombre")
    .limit(MAX_CLIENTES);

  if (busqueda) {
    // Quitar caracteres que rompen la sintaxis del filtro de PostgREST.
    const termino = busqueda.replace(/[,()*%\\]/g, " ").trim();
    if (termino) query = query.or(`nombre.ilike.*${termino}*,telefono.ilike.*${termino}*`);
  }
  if (etiqueta) query = query.contains("etiquetas", [etiqueta]);
  if (origen) query = query.eq("origen", origen);

  // Opciones de los filtros: todas las etiquetas y orígenes que usa el taller.
  const [{ data, error }, { data: opciones }, resumenes] = await Promise.all([
    query.returns<Fila[]>(),
    supabase.from("clientes").select("origen, etiquetas").eq("taller_id", tallerId).limit(5000),
    obtenerResumenes(tallerId).catch(() => null),
  ]);

  const etiquetasUsadas = [...new Set((opciones ?? []).flatMap((c) => c.etiquetas ?? []))].sort();
  const origenesUsados = [...new Set((opciones ?? []).map((c) => c.origen).filter(Boolean) as string[])].sort();

  const clientes = (data ?? [])
    .map((c) => ({ ...c, segmento: resumenes?.get(c.id)?.segmento ?? "sin_visitas" }))
    .filter((c) => !segmento || c.segmento === segmento);

  const hayFiltros = Boolean(busqueda || segmento || etiqueta || origen);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Clientes</h1>
        {puedeEditar && <BotonLink href="/clientes/nuevo">+ Nuevo cliente</BotonLink>}
      </div>

      {/* Formulario GET: los filtros quedan en la URL y se pueden compartir. */}
      <form role="search" className="space-y-2">
        <div className="flex gap-2">
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
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select name="segmento" defaultValue={segmento} aria-label="Segmento" className={ESTILO_SELECT}>
            <option value="">Todos los segmentos</option>
            {SEGMENTOS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.label}
              </option>
            ))}
          </select>
          <select name="etiqueta" defaultValue={etiqueta} aria-label="Etiqueta" className={ESTILO_SELECT}>
            <option value="">Todas las etiquetas</option>
            {etiquetasUsadas.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
          <select name="origen" defaultValue={origen} aria-label="Origen" className={ESTILO_SELECT}>
            <option value="">Todos los orígenes</option>
            {origenesUsados.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </div>
        {hayFiltros && (
          <Link href="/clientes" className="inline-block text-sm font-medium text-blue-600 hover:underline">
            Quitar filtros
          </Link>
        )}
      </form>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudieron cargar los clientes. Recargá la página."}
        </p>
      ) : clientes.length === 0 ? (
        <Tarjeta className="text-center text-slate-600">
          {hayFiltros
            ? "No hay clientes con esos filtros."
            : `Todavía no hay clientes.${puedeEditar ? " Empezá con “Nuevo cliente”." : ""}`}
        </Tarjeta>
      ) : (
        <>
          <p className="text-sm text-slate-500">
            {clientes.length} {clientes.length === 1 ? "cliente" : "clientes"}
          </p>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {clientes.map((c) => {
              const autos = c.vehiculos?.[0]?.count ?? 0;
              return (
                <li key={c.id}>
                  <Link href={`/clientes/${c.id}`} className="block px-4 py-3 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">{c.nombre}</p>
                        <p className="truncate text-sm text-slate-500">
                          {c.telefono || "Sin teléfono"} · {autos} {autos === 1 ? "vehículo" : "vehículos"}
                        </p>
                      </div>
                      <EtiquetaSegmento segmento={c.segmento} />
                    </div>
                    {(c.etiquetas?.length || c.origen) && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.origen && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">{c.origen}</span>
                        )}
                        {c.etiquetas?.map((e) => (
                          <span key={e} className="rounded-md bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700">
                            #{e}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
