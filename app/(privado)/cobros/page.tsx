import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { formatoFecha, formatoPesos, hoyISO } from "@/lib/ordenes";
import { labelMedioPago, sumarMontos } from "@/lib/cobros";
import { obtenerDeudores } from "@/lib/deudores";
import BotonWhatsapp from "@/components/boton-whatsapp";
import { Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Cobros" };

export default async function CobrosPage() {
  const { tallerId, rol, taller } = await obtenerSesion();
  const puedeContactar = puede(rol, "contactarClientes");
  const supabase = await createClient();
  const hoy = hoyISO();
  const inicioMes = `${hoy.slice(0, 7)}-01`;

  const [{ deudores, total, error }, pagosMes] = await Promise.all([
    obtenerDeudores(tallerId),
    supabase.from("pagos").select("monto, medio").eq("taller_id", tallerId).gte("fecha", inicioMes).lte("fecha", hoy),
  ]);

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudieron cargar los cobros."}
      </p>
    );
  }

  const porMedio = new Map<string, number>();
  for (const p of pagosMes.data ?? []) porMedio.set(p.medio, sumarMontos([porMedio.get(p.medio), p.monto]));
  const cobradoMes = sumarMontos([...porMedio.values()]);
  const nombreTaller = taller?.nombre ?? "el taller";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Cobros</h1>
        <p className="text-sm text-slate-500">Lo cobrado este mes y los clientes con saldo pendiente.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Tarjeta>
          <p className="text-sm font-semibold text-slate-700">Cobrado este mes</p>
          <p className="text-3xl font-bold text-slate-900">{formatoPesos(cobradoMes)}</p>
          {porMedio.size > 0 && (
            <ul className="mt-2 space-y-0.5 text-sm text-slate-600">
              {[...porMedio.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([medio, monto]) => (
                  <li key={medio} className="flex justify-between">
                    <span>{labelMedioPago(medio)}</span>
                    <span>{formatoPesos(monto)}</span>
                  </li>
                ))}
            </ul>
          )}
        </Tarjeta>
        <Tarjeta className={total > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <p className="text-sm font-semibold text-slate-700">Te deben</p>
          <p className={`text-3xl font-bold ${total > 0 ? "text-amber-700" : "text-slate-400"}`}>{formatoPesos(total)}</p>
          <p className="text-xs text-slate-500">
            {deudores.length === 1 ? "1 cliente" : `${deudores.length} clientes`} con órdenes terminadas o entregadas sin cobrar completas
          </p>
        </Tarjeta>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Clientes que deben</h2>
        {deudores.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">No hay saldos pendientes. ¡Todo cobrado!</Tarjeta>
        ) : (
          <ul className="space-y-3">
            {deudores.map((d) => (
              <li key={d.cliente.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/clientes/${d.cliente.id}`} className="font-semibold text-slate-900 hover:underline">
                      {d.cliente.nombre}
                    </Link>
                    {d.cliente.telefono && <p className="text-sm text-slate-500">{d.cliente.telefono}</p>}
                  </div>
                  <p className="text-lg font-bold text-amber-700">{formatoPesos(d.saldo)}</p>
                </div>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {d.ordenes.map((o) => (
                    <li key={o.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                      <Link href={`/ordenes/${o.id}`} className="text-blue-600 hover:underline">
                        {formatoFecha(o.fecha)} · <span className="font-mono">{o.patente}</span>
                        {o.vehiculo && ` · ${o.vehiculo}`}
                      </Link>
                      <span className="text-slate-600">
                        Total {formatoPesos(o.total)} · cobrado {formatoPesos(o.cobrado)} ·{" "}
                        <strong className="text-slate-900">debe {formatoPesos(o.saldo)}</strong>
                      </span>
                    </li>
                  ))}
                </ul>
                {puedeContactar && (
                  <div className="mt-3">
                    <BotonWhatsapp
                      telefono={d.cliente.telefono}
                      clienteId={d.cliente.id}
                      mensaje={`Hola ${d.cliente.nombre}, te escribimos de ${nombreTaller}. Te recordamos que quedó un saldo pendiente de ${formatoPesos(d.saldo)}${d.ordenes[0]?.patente ? ` por el trabajo en tu vehículo (${[...new Set(d.ordenes.map((o) => o.patente).filter(Boolean))].join(", ")})` : ""}. Cualquier consulta, avisanos. ¡Gracias!`}
                      registro={`Recordatorio de saldo pendiente (${formatoPesos(d.saldo)}) por WhatsApp.`}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                    >
                      Recordar por WhatsApp
                    </BotonWhatsapp>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
