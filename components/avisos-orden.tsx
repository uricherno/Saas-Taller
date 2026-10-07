"use client";

import { useState } from "react";
import { AVISOS_ORDEN, mensajeAviso, type AvisoOrden, type DatosAviso } from "@/lib/avisos-orden";
import BotonWhatsapp from "@/components/boton-whatsapp";

type Props = {
  datos: DatosAviso;
  telefono: string | null;
  clienteId: string;
  vehiculoId?: string | null;
  /** Aviso que se muestra primero, según el estado de la orden. */
  sugerido: AvisoOrden;
};

/**
 * Avisos al cliente sobre su auto (recibido, diagnóstico, listo).
 * El mensaje se puede editar antes de abrir WhatsApp, y queda registrado en la ficha.
 */
export default function AvisosOrden({ datos, telefono, clienteId, vehiculoId, sugerido }: Props) {
  const [tipo, setTipo] = useState<AvisoOrden>(sugerido);
  const [mensaje, setMensaje] = useState(() => mensajeAviso(sugerido, datos));
  const label = AVISOS_ORDEN.find((a) => a.valor === tipo)!.label;

  function elegir(nuevo: AvisoOrden) {
    setTipo(nuevo);
    setMensaje(mensajeAviso(nuevo, datos));
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <h2 className="font-semibold text-slate-900">Avisarle al cliente</h2>

      <div role="radiogroup" aria-label="Tipo de aviso" className="flex flex-wrap gap-2">
        {AVISOS_ORDEN.map((a) => (
          <button
            key={a.valor}
            type="button"
            role="radio"
            aria-checked={tipo === a.valor}
            onClick={() => elegir(a.valor)}
            className={
              tipo === a.valor
                ? "rounded-full bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
                : "rounded-full border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-sm text-slate-600">Mensaje (lo podés cambiar antes de enviar)</span>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={6}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
      </label>

      <BotonWhatsapp
        telefono={telefono}
        mensaje={mensaje.trim()}
        clienteId={clienteId}
        vehiculoId={vehiculoId}
        registro={`Aviso "${label}" enviado por WhatsApp:\n${mensaje.trim()}`}
      >
        Enviar por WhatsApp
      </BotonWhatsapp>
    </section>
  );
}