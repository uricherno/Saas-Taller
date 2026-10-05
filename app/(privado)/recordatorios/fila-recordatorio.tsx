"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { linkWhatsapp } from "@/lib/whatsapp";
import { marcarRecordatorioEnviado } from "./actions";

type Props = {
  ordenId: string | null;
  vencimientoIds: string[];
  /** Dueño y recepción: mandar el WhatsApp. El mecánico solo ve la lista. */
  puedeContactar: boolean;
  ultimoAviso: string | null;
  clienteId: string | null;
  clienteNombre: string;
  telefono: string | null;
  vehiculoId: string;
  patente: string;
  auto: string;
  motivos: string[];
  vencido: boolean;
  enviadoEn: string | null;
  mensajeInicial: string;
};

function formatoFechaHora(iso: string) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default function FilaRecordatorio(p: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState(p.mensajeInicial);
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();

  const tieneTelefono = Boolean(p.telefono?.trim());
  const telefonoValido = linkWhatsapp(p.telefono) !== null;
  const editarCliente = p.clienteId ? `/clientes/${p.clienteId}/editar` : null;

  function enviar() {
    const url = linkWhatsapp(p.telefono, mensaje.trim());
    if (!url) {
      setError("El teléfono no es válido para WhatsApp.");
      return;
    }
    // Abrir WhatsApp dentro del clic (si no, el navegador lo bloquea como popup)…
    window.open(url, "_blank", "noopener,noreferrer");
    // …y después registrar el aviso.
    setError(null);
    startTransition(async () => {
      const r = await marcarRecordatorioEnviado({
        ordenId: p.ordenId,
        vencimientoIds: p.vencimientoIds,
        clienteId: p.clienteId,
        vehiculoId: p.vehiculoId,
        texto: mensaje.trim(),
      });
      if (r.error) {
        setError(r.error);
      } else {
        setAbierto(false);
        router.refresh();
      }
    });
  }

  return (
    <li className="space-y-3 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{p.clienteNombre}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
            <Link
              href={`/vehiculos/${p.vehiculoId}`}
              className="rounded-md border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider text-slate-900 hover:bg-slate-100"
            >
              {p.patente}
            </Link>
            {p.auto && <span className="truncate">{p.auto}</span>}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            p.vencido ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"
          }`}
        >
          {p.vencido ? "Vencido" : "Próximo"}
        </span>
      </div>

      <ul className="space-y-0.5 text-sm text-slate-700">
        {p.motivos.map((m) => (
          <li key={m}>• {m}</li>
        ))}
      </ul>

      <p className="text-xs text-slate-500">
        {p.ultimoAviso
          ? `Último aviso: ${formatoFechaHora(p.ultimoAviso)}${p.enviadoEn ? "" : " (hay un motivo nuevo sin avisar)"}`
          : "Todavía no se avisó"}
      </p>

      {error && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!p.puedeContactar ? null : !tieneTelefono ? (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
            Sin teléfono
          </span>
          {editarCliente && (
            <Link href={editarCliente} className="font-medium text-blue-600 hover:underline">
              Cargar teléfono
            </Link>
          )}
        </p>
      ) : !telefonoValido ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          El teléfono “{p.telefono}” no es válido para WhatsApp.{" "}
          {editarCliente && (
            <Link href={editarCliente} className="font-medium underline">
              Corregirlo
            </Link>
          )}
        </p>
      ) : !abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 sm:w-auto"
        >
          {p.enviadoEn ? "Volver a avisar por WhatsApp" : "Avisar por WhatsApp"}
        </button>
      ) : (
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">Mensaje (podés editarlo)</span>
            <textarea
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              rows={4}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 focus:outline-none"
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                setMensaje(p.mensajeInicial);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={enviar}
              disabled={guardando || !mensaje.trim()}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {guardando ? "Registrando aviso…" : "Abrir WhatsApp y marcar como avisado"}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
