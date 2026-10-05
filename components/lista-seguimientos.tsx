import Link from "next/link";
import { formatoFecha, hoyISO } from "@/lib/ordenes";
import BotonWhatsapp from "@/components/boton-whatsapp";
import { BotonMarcarHecha } from "@/components/crm";

export type FilaSeguimiento = {
  id: string;
  titulo: string;
  vence_en: string;
  hecha_en: string | null;
  asignado: string | null;
  cliente: { id: string; nombre: string; telefono: string | null } | null;
  vehiculo: { id: string; patente: string; marca: string | null; modelo: string | null } | null;
  orden_id: string | null;
};

export const TITULO_POSVENTA = "Posventa:";

/** Mensaje de WhatsApp según el tipo de seguimiento (posventa o genérico). */
export function mensajeSeguimiento(s: FilaSeguimiento, taller: string) {
  const nombre = s.cliente?.nombre ?? "";
  const auto = [s.vehiculo?.marca, s.vehiculo?.modelo].filter(Boolean).join(" ") || "auto";
  if (s.titulo.startsWith(TITULO_POSVENTA)) {
    return `Hola ${nombre}, te escribimos de ${taller}. ¿Cómo anda el ${auto}${s.vehiculo ? ` (${s.vehiculo.patente})` : ""} después del trabajo que le hicimos? Cualquier cosa, estamos a disposición.`;
  }
  return `Hola ${nombre}, te escribimos de ${taller}.`;
}

function etiquetaVencimiento(venceEn: string, hoy: string) {
  if (venceEn < hoy) return { texto: `Vencido (${formatoFecha(venceEn)})`, color: "text-red-600" };
  if (venceEn === hoy) return { texto: "Hoy", color: "text-amber-700" };
  return { texto: formatoFecha(venceEn), color: "text-slate-500" };
}

export default function ListaSeguimientos({
  seguimientos,
  taller,
  puedeGestionar,
  mostrarCliente = true,
}: {
  seguimientos: FilaSeguimiento[];
  taller: string;
  /** Dueño y recepción: marcar hechos y mandar WhatsApp. */
  puedeGestionar: boolean;
  mostrarCliente?: boolean;
}) {
  const hoy = hoyISO();
  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {seguimientos.map((s) => {
        const vence = etiquetaVencimiento(s.vence_en, hoy);
        const hecha = Boolean(s.hecha_en);
        return (
          <li key={s.id} className={`space-y-2 px-4 py-3 ${hecha ? "bg-slate-50" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`font-medium ${hecha ? "text-slate-500 line-through" : "text-slate-900"}`}>{s.titulo}</p>
                <p className="text-sm text-slate-500">
                  <span className={hecha ? "" : `font-medium ${vence.color}`}>{hecha ? "Hecho" : vence.texto}</span>
                  {mostrarCliente && s.cliente && (
                    <>
                      {" · "}
                      <Link href={`/clientes/${s.cliente.id}`} className="text-blue-600 hover:underline">
                        {s.cliente.nombre}
                      </Link>
                    </>
                  )}
                  {s.vehiculo && (
                    <>
                      {" · "}
                      <Link href={`/vehiculos/${s.vehiculo.id}`} className="font-mono hover:underline">
                        {s.vehiculo.patente}
                      </Link>
                    </>
                  )}
                  {s.orden_id && (
                    <>
                      {" · "}
                      <Link href={`/ordenes/${s.orden_id}`} className="text-blue-600 hover:underline">
                        ver orden
                      </Link>
                    </>
                  )}
                  {s.asignado && ` · Para ${s.asignado}`}
                </p>
              </div>
              {puedeGestionar && <BotonMarcarHecha id={s.id} hecha={hecha} />}
            </div>
            {puedeGestionar && !hecha && s.cliente && (
              <BotonWhatsapp
                telefono={s.cliente.telefono}
                mensaje={mensajeSeguimiento(s, taller)}
                clienteId={s.cliente.id}
                vehiculoId={s.vehiculo?.id}
                className="rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
              >
                WhatsApp
              </BotonWhatsapp>
            )}
          </li>
        );
      })}
    </ul>
  );
}
