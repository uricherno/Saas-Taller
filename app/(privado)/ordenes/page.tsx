import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { ESTADOS, TIPOS_TRABAJO, esEstado, esTipoTrabajo } from "@/lib/ordenes";
import ListaOrdenes from "@/components/lista-ordenes";
import { BotonLink, Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Órdenes" };

function Chip({ href, activo, children }: { href: string; activo: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
        activo ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default async function OrdenesPage({ searchParams }: PageProps<"/ordenes">) {
  const { estado, tipo } = await searchParams;
  const filtroEstado = typeof estado === "string" && esEstado(estado) ? estado : null;
  const filtroTipo = typeof tipo === "string" && esTipoTrabajo(tipo) ? tipo : null;

  const { tallerId } = await obtenerSesion();
  const supabase = await createClient();
  let query = supabase
    .from("ordenes_trabajo")
    .select("id, fecha, estado, tipo_trabajo, descripcion, total, vehiculos(patente, marca, modelo, clientes(nombre))")
    .eq("taller_id", tallerId)
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(200);
  if (filtroEstado) query = query.eq("estado", filtroEstado);
  if (filtroTipo) query = query.eq("tipo_trabajo", filtroTipo);

  const { data: ordenes, error } = await query;

  // Arma la URL conservando el otro filtro.
  const url = (cambios: { estado?: string | null; tipo?: string | null }) => {
    const p = new URLSearchParams();
    const e = "estado" in cambios ? cambios.estado : filtroEstado;
    const t = "tipo" in cambios ? cambios.tipo : filtroTipo;
    if (e) p.set("estado", e);
    if (t) p.set("tipo", t);
    const q = p.toString();
    return q ? `/ordenes?${q}` : "/ordenes";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Órdenes de trabajo</h1>
        <BotonLink href="/ordenes/nueva">+ Nueva orden</BotonLink>
      </div>

      <div className="space-y-2">
        <nav aria-label="Filtrar por estado" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip href={url({ estado: null })} activo={!filtroEstado}>
            Todos los estados
          </Chip>
          {ESTADOS.map((e) => (
            <Chip key={e.valor} href={url({ estado: e.valor })} activo={filtroEstado === e.valor}>
              {e.label}
            </Chip>
          ))}
        </nav>
        <nav aria-label="Filtrar por tipo de trabajo" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip href={url({ tipo: null })} activo={!filtroTipo}>
            Todos los tipos
          </Chip>
          {TIPOS_TRABAJO.map((t) => (
            <Chip key={t.valor} href={url({ tipo: t.valor })} activo={filtroTipo === t.valor}>
              {t.label}
            </Chip>
          ))}
        </nav>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudieron cargar las órdenes. Recargá la página."}
        </p>
      ) : !ordenes?.length ? (
        <Tarjeta className="text-center text-slate-600">
          {filtroEstado || filtroTipo
            ? "No hay órdenes con esos filtros."
            : "Todavía no hay órdenes. Creá la primera con “+ Nueva orden”."}
        </Tarjeta>
      ) : (
        <ListaOrdenes ordenes={ordenes} mostrarVehiculo />
      )}
    </div>
  );
}
