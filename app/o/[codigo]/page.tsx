import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { formatoFecha, formatoKm, formatoPesos, labelTipo, labelTipoTrabajo } from "@/lib/ordenes";
import EtiquetaEstado from "@/components/etiqueta-estado";
import BotonAceptar from "./boton-aceptar";

// Página pública: la ve el cliente desde el link, sin cuenta. No se indexa.
export const metadata: Metadata = {
  title: "Tu orden",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type OrdenPublica = {
  taller: { nombre: string; telefono: string | null };
  orden: {
    fecha: string;
    estado: string;
    tipo_trabajo: string | null;
    descripcion: string | null;
    km_ingreso: number | null;
    total: number | string | null;
    proximo_service_fecha: string | null;
    proximo_service_km: number | null;
  };
  vehiculo: { patente: string | null; marca: string | null; modelo: string | null; anio: number | null };
  cliente: string | null;
  items: { tipo: string; descripcion: string; cantidad: number | string; precio_unitario: number | string }[];
  aceptado_en: string | null;
  total_aceptado: number | string | null;
};

const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

function subtotal(i: { cantidad: number | string; precio_unitario: number | string }) {
  return Math.round(Number(i.cantidad) * Number(i.precio_unitario) * 100) / 100;
}

function NoDisponible() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-slate-900">Este link no está disponible</h1>
      <p className="mt-2 text-slate-600">Puede que el taller lo haya anulado. Pediles uno nuevo.</p>
    </main>
  );
}

export default async function OrdenPublicaPage({ params }: PageProps<"/o/[codigo]">) {
  const { codigo } = await params;
  if (!/^[0-9a-f]{64}$/.test(codigo)) return <NoDisponible />;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("orden_publica", { p_codigo: codigo });
  if (error) console.error("[link público] Error al leer la orden:", error);
  const d = data as OrdenPublica | null;
  if (!d) return <NoDisponible />;

  const { orden, vehiculo, taller } = d;
  const esPresupuesto = orden.estado === "presupuestado";
  const repuestos = d.items.filter((i) => i.tipo === "repuesto").reduce((a, i) => a + subtotal(i), 0);
  const manoObra = d.items.filter((i) => i.tipo !== "repuesto").reduce((a, i) => a + subtotal(i), 0);
  const telefonoLimpio = taller.telefono?.replace(/[^\d+]/g, "");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-500">{taller.nombre}</p>
            <h1 className="text-2xl font-bold text-slate-900">{esPresupuesto ? "Presupuesto" : "Orden de trabajo"}</h1>
            <p className="text-sm text-slate-500">
              Fecha: {formatoFecha(orden.fecha)}
              {orden.tipo_trabajo && ` · ${labelTipoTrabajo(orden.tipo_trabajo)}`}
            </p>
          </div>
          <EtiquetaEstado estado={orden.estado} />
        </header>

        <section className="grid grid-cols-1 gap-4 border-b border-slate-200 py-4 sm:grid-cols-2">
          {d.cliente && (
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Cliente</p>
              <p className="font-medium text-slate-900">{d.cliente}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Vehículo</p>
            <p className="font-mono font-semibold tracking-wider text-slate-900">{vehiculo.patente}</p>
            <p className="text-sm text-slate-600">{[vehiculo.marca, vehiculo.modelo, vehiculo.anio].filter(Boolean).join(" · ")}</p>
            {orden.km_ingreso != null && <p className="text-sm text-slate-600">Km de ingreso: {formatoKm(orden.km_ingreso)}</p>}
          </div>
        </section>

        {orden.descripcion && (
          <section className="border-b border-slate-200 py-4">
            <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">Trabajo</p>
            <p className="mt-1 whitespace-pre-wrap text-slate-800">{orden.descripcion}</p>
          </section>
        )}

        <section className="py-4">
          <p className="mb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">Detalle</p>
          {d.items.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay repuestos ni mano de obra cargados.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-sm">
              {d.items.map((i, n) => (
                <li key={n} className="flex justify-between gap-3 py-2">
                  <span>
                    <span className="text-slate-900">{i.descripcion}</span>
                    <span className="block text-xs text-slate-500">
                      {labelTipo(i.tipo)} · {Number(i.cantidad).toLocaleString("es-AR")} × {formatoPesos(i.precio_unitario)}
                    </span>
                  </span>
                  <span className="font-medium whitespace-nowrap text-slate-900">{formatoPesos(subtotal(i))}</span>
                </li>
              ))}
            </ul>
          )}
          <dl className="mt-4 ml-auto max-w-xs space-y-1 border-t border-slate-200 pt-3 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Repuestos</dt>
              <dd>{formatoPesos(repuestos)}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Mano de obra</dt>
              <dd>{formatoPesos(manoObra)}</dd>
            </div>
            <div className="flex justify-between pt-1 text-lg font-bold text-slate-900">
              <dt>Total</dt>
              <dd>{formatoPesos(orden.total)}</dd>
            </div>
          </dl>
        </section>

        {(orden.proximo_service_fecha || orden.proximo_service_km) && (
          <section className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900">
            <p className="font-semibold">Próximo service</p>
            <p>
              {[
                orden.proximo_service_fecha && `el ${formatoFecha(orden.proximo_service_fecha)}`,
                orden.proximo_service_km && `a los ${formatoKm(orden.proximo_service_km)}`,
              ]
                .filter(Boolean)
                .join(" o ")}
              .
            </p>
          </section>
        )}
      </article>

      {d.aceptado_en ? (
        <p className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✓ Aceptaste este presupuesto el {fechaHora.format(new Date(d.aceptado_en))}
          {d.total_aceptado != null && <> por {formatoPesos(d.total_aceptado)}</>}.
        </p>
      ) : (
        esPresupuesto && <BotonAceptar codigo={codigo} total={orden.total} />
      )}

      {taller.telefono && (
        <p className="text-center text-sm text-slate-600">
          ¿Dudas? Comunicate con {taller.nombre}:{" "}
          <a href={`tel:${telefonoLimpio}`} className="font-semibold text-blue-600 hover:underline">
            {taller.telefono}
          </a>
        </p>
      )}
    </main>
  );
}
