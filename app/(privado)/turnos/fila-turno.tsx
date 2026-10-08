"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ESTADOS_TURNO, infoEstadoTurno } from "@/lib/turnos";
import { linkWhatsapp } from "@/lib/whatsapp";
import { registrarWhatsapp } from "@/app/(privado)/crm/actions";
import { cambiarEstadoTurno, eliminarTurno, marcarTurnoRecordado } from "./actions";

export type Turno = {
  id: string;
  hora: string;
  duracion: string;
  estado: string;
  motivo: string | null;
  nombre: string;
  telefono: string | null;
  patente: string | null;
  clienteId: string | null;
  vehiculoId: string | null;
  recordadoEn: string | null;
  mensaje: string;
};

export default function FilaTurno({
  turno,
  puedeGestionar,
  puedeBorrar,
}: {
  turno: Turno;
  puedeGestionar: boolean;
  puedeBorrar: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, startTransition] = useTransition();
  const estado = infoEstadoTurno(turno.estado);
  const wa = linkWhatsapp(turno.telefono, turno.mensaje);
  const cerrado = turno.estado === "atendido" || turno.estado === "cancelado" || turno.estado === "no_vino";

  function correr(accion: () => Promise<{ error?: string } | void>) {
    setError(null);
    startTransition(async () => {
      const r = await accion();
      if (r?.error) setError(r.error);
      router.refresh();
    });
  }

  return (
    <li className={`space-y-2 px-4 py-3 ${cerrado ? "opacity-70" : ""}`}>
      <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
        <p className="w-14 shrink-0 font-mono text-lg font-semibold text-slate-900">{turno.hora}</p>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900">
            {turno.clienteId ? (
              <Link href={`/clientes/${turno.clienteId}`} className="hover:underline">
                {turno.nombre}
              </Link>
            ) : (
              turno.nombre
            )}
            {turno.patente && (
              <>
                {" · "}
                {turno.vehiculoId ? (
                  <Link href={`/vehiculos/${turno.vehiculoId}`} className="font-mono tracking-wider hover:underline">
                    {turno.patente}
                  </Link>
                ) : (
                  <span className="font-mono tracking-wider">{turno.patente}</span>
                )}
              </>
            )}
          </p>
          <p className="text-sm text-slate-600">
            {turno.duracion}
            {turno.motivo && ` · ${turno.motivo}`}
          </p>
          {turno.recordadoEn && <p className="text-xs text-green-700">Recordado por WhatsApp</p>}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${estado.color}`}>
          {estado.label}
        </span>
      </div>

      {puedeGestionar && (
        <div className="flex flex-wrap items-center gap-2 pl-0 sm:pl-[4.25rem]">
          {!cerrado && wa && (
            <button
              type="button"
              disabled={cargando}
              onClick={() => {
                // Abrir dentro del clic (si no, el navegador lo bloquea) y después registrar.
                window.open(wa, "_blank", "noopener,noreferrer");
                correr(async () => {
                  if (turno.clienteId) {
                    const r = await registrarWhatsapp({
                      clienteId: turno.clienteId,
                      vehiculoId: turno.vehiculoId,
                      texto: `Recordatorio de turno enviado por WhatsApp:\n${turno.mensaje}`,
                    });
                    if (r.error) return r;
                  }
                  return marcarTurnoRecordado(turno.id);
                });
              }}
              className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              Recordar por WhatsApp
            </button>
          )}
          {!cerrado && !wa && <span className="text-xs text-amber-700">Sin teléfono válido para WhatsApp</span>}

          {turno.vehiculoId && turno.estado !== "cancelado" && (
            <Link
              href={`/ordenes/nueva?vehiculo=${turno.vehiculoId}`}
              onClick={() => {
                if (turno.estado !== "atendido") void cambiarEstadoTurno(turno.id, "atendido");
              }}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Llegó: crear orden
            </Link>
          )}

          <label className="sr-only" htmlFor={`estado-${turno.id}`}>
            Estado del turno
          </label>
          <select
            id={`estado-${turno.id}`}
            value={turno.estado}
            disabled={cargando}
            onChange={(e) => {
              const nuevo = e.target.value;
              correr(() => cambiarEstadoTurno(turno.id, nuevo));
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
          >
            {ESTADOS_TURNO.map((e) => (
              <option key={e.valor} value={e.valor}>
                {e.label}
              </option>
            ))}
          </select>

          {puedeBorrar && (
            <button
              type="button"
              disabled={cargando}
              onClick={() => {
                if (confirm("¿Borrar este turno?")) correr(() => eliminarTurno(turno.id));
              }}
              className="rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-red-50 hover:text-red-600"
            >
              Borrar
            </button>
          )}
        </div>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </li>
  );
}
