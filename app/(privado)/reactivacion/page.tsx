import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { formatoFecha, formatoPesos } from "@/lib/ordenes";
import { obtenerResumenes } from "@/lib/resumen-clientes";
import EtiquetaSegmento from "@/components/etiqueta-segmento";
import { Tarjeta } from "@/components/ui";
import FilaReactivacion from "./fila-reactivacion";

export const metadata: Metadata = { title: "Reactivación" };

const FILTROS = [
  { valor: "todos", label: "Todos" },
  { valor: "en_riesgo", label: "En riesgo" },
  { valor: "inactivo", label: "Inactivos" },
] as const;

function mensajePorDefecto(nombre: string, taller: string, auto: string | null) {
  return (
    `Hola ${nombre}, ¿cómo estás? Te escribimos de ${taller}. ` +
    `Hace un tiempo que no vemos ${auto ? `tu ${auto}` : "tu auto"} por el taller: ` +
    `¿querés que le hagamos un control? Te podemos dar turno esta semana.`
  );
}

const fechaCorta = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

export default async function ReactivacionPage({ searchParams }: PageProps<"/reactivacion">) {
  const sp = await searchParams;
  const filtro = FILTROS.some((f) => f.valor === sp.filtro) ? (sp.filtro as string) : "todos";

  const { tallerId, rol, taller } = await obtenerSesion();
  const supabase = await createClient();

  let resumenes;
  try {
    resumenes = await obtenerResumenes(tallerId);
  } catch (e) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {faltaMigracion(e as { code?: string }) ? MENSAJE_FALTA_MIGRACION : "No se pudo cargar la lista."}
      </p>
    );
  }

  const objetivo = [...resumenes.values()]
    .filter((r) => r.segmento === "en_riesgo" || r.segmento === "inactivo")
    .filter((r) => filtro === "todos" || r.segmento === filtro)
    // Los que hace más tiempo que no vienen, primero.
    .sort((a, b) => (a.ultima_visita ?? "").localeCompare(b.ultima_visita ?? ""));

  const ids = objetivo.map((r) => r.cliente_id).slice(0, 300);
  const [{ data: clientes }, { data: contactos }] = ids.length
    ? await Promise.all([
        supabase
          .from("clientes")
          .select("id, nombre, telefono, vehiculos(id, patente, marca, modelo)")
          .eq("taller_id", tallerId)
          .in("id", ids),
        supabase
          .from("interacciones")
          .select("cliente_id, creado_en")
          .eq("taller_id", tallerId)
          .eq("tipo", "whatsapp")
          .in("cliente_id", ids)
          .order("creado_en", { ascending: false })
          .limit(2000),
      ])
    : [{ data: [] }, { data: [] }];

  const porId = new Map((clientes ?? []).map((c) => [c.id, c]));
  const ultimoWhatsapp = new Map<string, string>();
  for (const x of contactos ?? []) if (!ultimoWhatsapp.has(x.cliente_id)) ultimoWhatsapp.set(x.cliente_id, x.creado_en);

  const nombreTaller = taller?.nombre ?? "el taller";
  const conteo = (s: string) =>
    [...resumenes.values()].filter((r) => (s === "todos" ? r.segmento === "en_riesgo" || r.segmento === "inactivo" : r.segmento === s)).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reactivación</h1>
        <p className="text-sm text-slate-500">
          Clientes que hace más de 6 meses que no traen el auto (En riesgo: 6 a 12 meses; Inactivos: más de 12).
        </p>
      </div>

      <nav aria-label="Filtrar por segmento" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTROS.map((f) => {
          const activo = f.valor === filtro;
          return (
            <Link
              key={f.valor}
              href={`/reactivacion?filtro=${f.valor}`}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                activo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f.label} <span className={activo ? "text-blue-100" : "text-slate-400"}>({conteo(f.valor)})</span>
            </Link>
          );
        })}
      </nav>

      {objetivo.length === 0 ? (
        <Tarjeta className="text-center text-slate-600">No hay clientes para reactivar. ¡Bien!</Tarjeta>
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
          {objetivo.map((r) => {
            const c = porId.get(r.cliente_id);
            if (!c) return null;
            const v = (c.vehiculos as { id: string; patente: string; marca: string | null; modelo: string | null }[])?.[0];
            const auto = v ? [v.marca, v.modelo].filter(Boolean).join(" ") || v.patente : null;
            const contacto = ultimoWhatsapp.get(c.id);
            return (
              <FilaReactivacion
                key={c.id}
                cliente={{ id: c.id, nombre: c.nombre, telefono: c.telefono }}
                auto={auto}
                vehiculoId={v?.id ?? null}
                detalle={`Última visita: ${formatoFecha(r.ultima_visita)} · ${r.visitas} ${r.visitas === 1 ? "visita" : "visitas"} · ${formatoPesos(r.total_gastado)}`}
                ultimoContacto={contacto ? fechaCorta.format(new Date(contacto)) : null}
                mensajeInicial={mensajePorDefecto(c.nombre, nombreTaller, auto)}
                puedeContactar={puede(rol, "contactarClientes")}
                etiquetaSegmento={<EtiquetaSegmento segmento={r.segmento} />}
              />
            );
          })}
        </ul>
      )}
    </div>
  );
}
