import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { puede } from "@/lib/permisos";
import { obtenerSesion } from "@/lib/sesion";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import {
  DIAS_ANTICIPACION,
  KM_ANTICIPACION,
  mensajeRecordatorio,
  obtenerRecordatorios,
  type Recordatorio,
} from "@/lib/recordatorios";
import { Tarjeta } from "@/components/ui";
import FilaRecordatorio from "./fila-recordatorio";

export const metadata: Metadata = { title: "Recordatorios" };

const FILTROS = [
  { valor: "vencidos", label: "Vencidos", vacio: "No hay services vencidos sin avisar." },
  { valor: "proximos", label: "Próximos", vacio: "No hay services próximos sin avisar." },
  { valor: "avisados", label: "Ya avisados", vacio: "Todavía no avisaste a nadie." },
] as const;

type Filtro = (typeof FILTROS)[number]["valor"];

function aplicarFiltro(lista: Recordatorio[], filtro: Filtro) {
  switch (filtro) {
    case "vencidos":
      return lista.filter((r) => r.vencido && !r.enviadoEn);
    case "proximos":
      return lista.filter((r) => !r.vencido && !r.enviadoEn);
    case "avisados":
      return lista.filter((r) => r.enviadoEn);
  }
}

export default async function RecordatoriosPage({ searchParams }: PageProps<"/recordatorios">) {
  const { filtro: f } = await searchParams;
  const filtro: Filtro = FILTROS.some((x) => x.valor === f) ? (f as Filtro) : "vencidos";

  const { tallerId, taller, rol } = await obtenerSesion();
  const supabase = await createClient();
  const [{ recordatorios, error }, { data: datosTaller, error: errorTaller }] = await Promise.all([
    obtenerRecordatorios(tallerId),
    supabase.from("talleres").select("mensaje_recordatorio").eq("id", tallerId).maybeSingle(),
  ]);
  const plantilla = datosTaller?.mensaje_recordatorio ?? null;
  const nombreTaller = taller?.nombre ?? "el taller";
  const visibles = aplicarFiltro(recordatorios, filtro);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Recordatorios de service</h1>
        <p className="text-sm text-slate-500">
          Próximo service (según la última orden terminada o entregada), VTV y seguro: vencidos, dentro de{" "}
          {DIAS_ANTICIPACION} días o, por km, a {KM_ANTICIPACION} km o menos. El texto del mensaje se cambia en{" "}
          <Link href="/ajustes" className="font-medium text-blue-600 hover:underline">
            Ajustes
          </Link>
          .
        </p>
      </div>

      <nav aria-label="Filtrar recordatorios" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((x) => {
          const cantidad = aplicarFiltro(recordatorios, x.valor).length;
          const activo = x.valor === filtro;
          return (
            <Link
              key={x.valor}
              href={`/recordatorios?filtro=${x.valor}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                activo
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {x.label} <span className={activo ? "text-blue-100" : "text-slate-400"}>({cantidad})</span>
            </Link>
          );
        })}
      </nav>

      {error || faltaMigracion(errorTaller) ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(error) || faltaMigracion(errorTaller)
            ? MENSAJE_FALTA_MIGRACION
            : "No se pudieron cargar los recordatorios. Recargá la página."}
        </p>
      ) : visibles.length === 0 ? (
        <Tarjeta className="text-center text-slate-600">{FILTROS.find((x) => x.valor === filtro)?.vacio}</Tarjeta>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {visibles.map((r) => (
            <FilaRecordatorio
              key={r.vehiculo.id}
              ordenId={r.ordenId}
              vencimientoIds={r.vencimientos.map((x) => x.id)}
              puedeContactar={puede(rol, "contactarClientes")}
              ultimoAviso={r.ultimoAviso}
              clienteId={r.cliente?.id ?? null}
              clienteNombre={r.cliente?.nombre ?? "Cliente sin nombre"}
              telefono={r.cliente?.telefono ?? null}
              vehiculoId={r.vehiculo.id}
              patente={r.vehiculo.patente}
              auto={[r.vehiculo.marca, r.vehiculo.modelo].filter(Boolean).join(" ")}
              motivos={r.motivos}
              vencido={r.vencido}
              enviadoEn={r.enviadoEn}
              mensajeInicial={mensajeRecordatorio(r, nombreTaller, plantilla)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
