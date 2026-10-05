import Link from "next/link";
import EtiquetaEstado from "@/components/etiqueta-estado";
import { formatoFecha, formatoPesos, labelTipoTrabajo } from "@/lib/ordenes";

type UnoOVarios<T> = T | T[] | null | undefined;

/** Las relaciones de Supabase pueden venir como objeto o como lista de uno. */
function uno<T>(x: UnoOVarios<T>): T | null {
  return Array.isArray(x) ? (x[0] ?? null) : (x ?? null);
}

export type FilaOrden = {
  id: string;
  fecha: string;
  estado: string;
  tipo_trabajo?: string | null;
  descripcion: string | null;
  total: number | string | null;
  vehiculos?: UnoOVarios<{
    patente: string;
    marca: string | null;
    modelo: string | null;
    clientes?: UnoOVarios<{ nombre: string }>;
  }>;
};

/** Lista de órdenes. Con `mostrarVehiculo` muestra patente y cliente (no hace falta en el historial). */
export default function ListaOrdenes({
  ordenes,
  mostrarVehiculo = false,
}: {
  ordenes: FilaOrden[];
  mostrarVehiculo?: boolean;
}) {
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {ordenes.map((o) => {
        const v = uno(o.vehiculos);
        return (
          <li key={o.id}>
            <Link href={`/ordenes/${o.id}`} className="block px-4 py-3 hover:bg-slate-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {mostrarVehiculo && v && (
                    <span className="shrink-0 rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-slate-900">
                      {v.patente}
                    </span>
                  )}
                  <span className="text-sm text-slate-500">{formatoFecha(o.fecha)}</span>
                  {o.tipo_trabajo && (
                    <span className="truncate text-xs font-medium text-slate-600">· {labelTipoTrabajo(o.tipo_trabajo)}</span>
                  )}
                </div>
                <EtiquetaEstado estado={o.estado} />
              </div>
              {mostrarVehiculo && v && (
                <p className="mt-1 truncate text-sm font-medium text-slate-900">
                  {uno(v.clientes)?.nombre}
                  {(v.marca || v.modelo) && (
                    <span className="font-normal text-slate-500"> · {[v.marca, v.modelo].filter(Boolean).join(" ")}</span>
                  )}
                </p>
              )}
              <div className="mt-1 flex items-end justify-between gap-3">
                <p className="line-clamp-2 min-w-0 text-sm text-slate-600">
                  {o.descripcion || <span className="text-slate-400">Sin descripción</span>}
                </p>
                <p className="shrink-0 font-semibold text-slate-900">{formatoPesos(o.total)}</p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
