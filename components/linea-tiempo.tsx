import Link from "next/link";
import EtiquetaEstado from "@/components/etiqueta-estado";
import { infoInteraccion } from "@/lib/crm";
import { formatoFecha, formatoPesos, labelTipoTrabajo } from "@/lib/ordenes";

export type EventoLineaTiempo =
  | {
      clase: "orden";
      id: string;
      fecha: string; // clave de orden (ISO)
      estado: string;
      tipoTrabajo: string | null;
      descripcion: string | null;
      total: number | string | null;
      patente: string | null;
    }
  | {
      clase: "interaccion";
      id: string;
      fecha: string;
      tipo: string;
      texto: string;
      autor: string | null;
      patente: string | null;
    }
  | {
      clase: "seguimiento";
      id: string;
      fecha: string;
      titulo: string;
      venceEn: string;
      hecha: boolean;
      autor: string | null;
    };

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function cuando(e: EventoLineaTiempo) {
  // Las órdenes tienen solo fecha (sin hora).
  return e.clase === "orden" ? formatoFecha(e.fecha) : fechaHora.format(new Date(e.fecha));
}

/** Órdenes, interacciones y seguimientos de un cliente, de lo más reciente a lo más antiguo. */
export default function LineaTiempo({ eventos }: { eventos: EventoLineaTiempo[] }) {
  if (eventos.length === 0) {
    return <p className="text-sm text-slate-500">Todavía no hay movimientos para este cliente.</p>;
  }

  return (
    <ol className="relative space-y-4 border-l-2 border-slate-200 pl-5">
      {eventos.map((e) => (
        <li key={`${e.clase}-${e.id}`} className="relative">
          <span className="absolute top-1 -left-[1.72rem] flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs ring-2 ring-slate-200">
            {e.clase === "orden" ? "🛠" : e.clase === "seguimiento" ? (e.hecha ? "✓" : "⏳") : infoInteraccion(e.tipo).icono}
          </span>
          <p className="text-xs text-slate-500">
            {cuando(e)}
            {"autor" in e && e.autor && ` · ${e.autor}`}
            {"patente" in e && e.patente && <span className="font-mono"> · {e.patente}</span>}
          </p>

          {e.clase === "orden" && (
            <Link href={`/ordenes/${e.id}`} className="mt-0.5 block rounded-lg hover:bg-slate-50">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-slate-900">Orden · {labelTipoTrabajo(e.tipoTrabajo) || "Trabajo"}</span>
                <EtiquetaEstado estado={e.estado} />
                <span className="text-sm font-semibold text-slate-900">{formatoPesos(e.total)}</span>
              </span>
              {e.descripcion && <span className="line-clamp-2 text-sm text-slate-600">{e.descripcion}</span>}
            </Link>
          )}

          {e.clase === "interaccion" && (
            <div className="mt-0.5">
              <p className="text-sm font-medium text-slate-900">{infoInteraccion(e.tipo).label}</p>
              <p className="text-sm whitespace-pre-wrap text-slate-700">{e.texto}</p>
            </div>
          )}

          {e.clase === "seguimiento" && (
            <div className="mt-0.5">
              <p className={`text-sm font-medium ${e.hecha ? "text-slate-500 line-through" : "text-slate-900"}`}>
                Seguimiento: {e.titulo}
              </p>
              <p className="text-xs text-slate-500">
                {e.hecha ? "Hecho" : `Para el ${formatoFecha(e.venceEn)}`}
              </p>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
