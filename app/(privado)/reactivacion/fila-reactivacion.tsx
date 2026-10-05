"use client";

import Link from "next/link";
import { useState } from "react";
import BotonWhatsapp from "@/components/boton-whatsapp";

export default function FilaReactivacion({
  cliente,
  auto,
  vehiculoId,
  detalle,
  ultimoContacto,
  mensajeInicial,
  puedeContactar,
  etiquetaSegmento,
}: {
  cliente: { id: string; nombre: string; telefono: string | null };
  auto: string | null;
  vehiculoId: string | null;
  detalle: string;
  ultimoContacto: string | null;
  mensajeInicial: string;
  puedeContactar: boolean;
  etiquetaSegmento: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState(mensajeInicial);

  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <Link href={`/clientes/${cliente.id}`} className="min-w-0 hover:underline">
          <p className="truncate font-medium text-slate-900">{cliente.nombre}</p>
          <p className="text-sm text-slate-500">
            {auto && `${auto} · `}
            {detalle}
          </p>
          {ultimoContacto && <p className="text-xs text-slate-500">Último WhatsApp: {ultimoContacto}</p>}
        </Link>
        {etiquetaSegmento}
      </div>

      {puedeContactar &&
        (abierto ? (
          <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Mensaje (podés editarlo)</span>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={4}
                maxLength={1500}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setAbierto(false);
                  setMensaje(mensajeInicial);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancelar
              </button>
              <BotonWhatsapp
                telefono={cliente.telefono}
                mensaje={mensaje.trim()}
                clienteId={cliente.id}
                vehiculoId={vehiculoId}
                registro={`Reactivación: ${mensaje.trim()}`}
                className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
              >
                Abrir WhatsApp
              </BotonWhatsapp>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="rounded-lg border border-green-300 bg-white px-3 py-2 text-sm font-semibold text-green-700 hover:bg-green-50"
          >
            Escribir por WhatsApp
          </button>
        ))}
    </li>
  );
}
