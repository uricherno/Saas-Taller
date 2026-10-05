import Link from "next/link";
import { formatoPesos } from "@/lib/ordenes";
import { mensajePresupuestoPendiente, type PresupuestoPendiente } from "@/lib/presupuestos-pendientes";
import BotonWhatsapp from "@/components/boton-whatsapp";
import { NuevoSeguimiento } from "@/components/crm";

function manana() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }).format(d);
}

export default function ListaPresupuestos({
  presupuestos,
  taller,
  puedeContactar,
  equipo,
}: {
  presupuestos: PresupuestoPendiente[];
  taller: string;
  puedeContactar: boolean;
  equipo: { id: string; nombre: string }[];
}) {
  const vence = manana();
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {presupuestos.map((p) => (
        <li key={p.id} className="space-y-2 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <Link href={`/ordenes/${p.id}`} className="min-w-0 hover:underline">
              <p className="truncate font-medium text-slate-900">
                {p.cliente?.nombre ?? "Cliente"}
                {p.vehiculo && <span className="ml-2 font-mono text-sm text-slate-600">{p.vehiculo.patente}</span>}
              </p>
              <p className="text-sm text-slate-500">
                Hace {p.dias} días{p.descripcion && ` · ${p.descripcion}`}
              </p>
            </Link>
            <span className="shrink-0 font-semibold text-slate-900">{formatoPesos(p.total)}</span>
          </div>
          {puedeContactar && p.cliente && (
            <div className="flex flex-wrap items-start gap-2">
              <BotonWhatsapp
                telefono={p.cliente.telefono}
                mensaje={mensajePresupuestoPendiente(p, taller)}
                clienteId={p.cliente.id}
                vehiculoId={p.vehiculo?.id}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                WhatsApp
              </BotonWhatsapp>
              <NuevoSeguimiento
                clienteId={p.cliente.id}
                vehiculoId={p.vehiculo?.id}
                ordenId={p.id}
                equipo={equipo}
                tituloSugerido="Volver a consultar por el presupuesto"
                venceSugerido={vence}
              />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
