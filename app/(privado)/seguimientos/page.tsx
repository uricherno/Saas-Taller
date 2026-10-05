import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { obtenerEquipo } from "@/lib/equipo";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { hoyISO } from "@/lib/ordenes";
import { aFilasSeguimiento, SELECT_SEGUIMIENTO } from "@/lib/seguimientos";
import ListaSeguimientos from "@/components/lista-seguimientos";
import { Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Seguimientos" };

const FILTROS = [
  { valor: "vencidos", label: "Vencidos", vacio: "No hay seguimientos vencidos. ¡Bien!" },
  { valor: "hoy", label: "Hoy", vacio: "No hay nada para hoy." },
  { valor: "proximos", label: "Próximos", vacio: "No hay seguimientos programados." },
  { valor: "hechos", label: "Hechos", vacio: "Todavía no se marcó ninguno como hecho." },
] as const;
type Filtro = (typeof FILTROS)[number]["valor"];

export default async function SeguimientosPage({ searchParams }: PageProps<"/seguimientos">) {
  const sp = await searchParams;
  const filtro: Filtro = FILTROS.some((f) => f.valor === sp.filtro) ? (sp.filtro as Filtro) : "hoy";
  const soloMios = sp.mios === "1";

  const { tallerId, userId, rol, taller } = await obtenerSesion();
  const supabase = await createClient();
  const hoy = hoyISO();

  const base = () => {
    let q = supabase.from("seguimientos").select(SELECT_SEGUIMIENTO, { count: "exact" }).eq("taller_id", tallerId);
    if (soloMios) q = q.eq("asignado_a", userId);
    return q;
  };

  const consultas = {
    vencidos: base().is("hecha_en", null).lt("vence_en", hoy).order("vence_en"),
    hoy: base().is("hecha_en", null).eq("vence_en", hoy).order("creado_en"),
    proximos: base().is("hecha_en", null).gt("vence_en", hoy).order("vence_en"),
    hechos: base().not("hecha_en", "is", null).order("hecha_en", { ascending: false }),
  };

  // Una consulta por pestaña (para mostrar los contadores); la lista solo de la elegida.
  const [equipo, ...resultados] = await Promise.all([
    obtenerEquipo(tallerId),
    ...FILTROS.map((f) => consultas[f.valor].limit(f.valor === filtro ? 200 : 1)),
  ]);
  const porFiltro = Object.fromEntries(FILTROS.map((f, i) => [f.valor, resultados[i]])) as Record<
    Filtro,
    (typeof resultados)[number]
  >;
  const actual = porFiltro[filtro];
  const nombres = new Map(equipo.map((u) => [u.id, u.nombre]));

  const url = (cambios: { filtro?: string; mios?: boolean }) => {
    const p = new URLSearchParams({ filtro: cambios.filtro ?? filtro });
    if (cambios.mios ?? soloMios) p.set("mios", "1");
    return `/seguimientos?${p}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Seguimientos</h1>
        <p className="text-sm text-slate-500">
          Tareas con clientes. Se crean desde la ficha del cliente, del vehículo o de una orden. Las de posventa se
          crean solas al entregar un auto.
        </p>
      </div>

      <nav aria-label="Filtrar seguimientos" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((f) => {
          const activo = f.valor === filtro;
          return (
            <Link
              key={f.valor}
              href={url({ filtro: f.valor })}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                activo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f.label}{" "}
              <span className={activo ? "text-blue-100" : "text-slate-400"}>({porFiltro[f.valor].count ?? 0})</span>
            </Link>
          );
        })}
      </nav>

      <Link href={url({ mios: !soloMios })} className="inline-flex items-center gap-2 text-sm text-slate-700">
        <span
          aria-hidden
          className={`flex h-5 w-5 items-center justify-center rounded border ${soloMios ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white"}`}
        >
          {soloMios && "✓"}
        </span>
        Solo los asignados a mí
      </Link>

      {actual.error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(actual.error)
            ? MENSAJE_FALTA_MIGRACION
            : "No se pudieron cargar los seguimientos. Recargá la página."}
        </p>
      ) : !actual.data?.length ? (
        <Tarjeta className="text-center text-slate-600">{FILTROS.find((f) => f.valor === filtro)?.vacio}</Tarjeta>
      ) : (
        <ListaSeguimientos
          seguimientos={aFilasSeguimiento(actual.data, nombres)}
          taller={taller?.nombre ?? "el taller"}
          puedeGestionar={puede(rol, "contactarClientes")}
        />
      )}
    </div>
  );
}
