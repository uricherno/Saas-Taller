"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { Alerta } from "@/components/ui";
import { reactivarTaller, suspenderTaller } from "./actions";

/** Suspender (con motivo) o reactivar un taller. */
export function AccionesTaller({ tallerId, nombre, suspendido }: { tallerId: string; nombre: string; suspendido: boolean }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(suspenderTaller.bind(null, tallerId), {});
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [reactivando, startTransition] = useTransition();

  if (suspendido) {
    return (
      <div className="space-y-1">
        <button
          type="button"
          disabled={reactivando}
          onClick={() =>
            startTransition(async () => {
              const r = await reactivarTaller(tallerId);
              setMensaje(r.error ?? null);
            })
          }
          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        >
          {reactivando ? "Reactivando…" : "Reactivar"}
        </button>
        {mensaje && <p className="text-xs text-red-600">{mensaje}</p>}
      </div>
    );
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
      >
        Suspender
      </button>
    );
  }

  return (
    <form action={enviar} className="w-full space-y-2 rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm text-red-800">
        Suspender <strong>{nombre}</strong>: nadie del taller va a poder entrar ni ver sus datos hasta que lo reactives. No se borra nada.
      </p>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <input
        name="motivo"
        maxLength={500}
        placeholder="Motivo (ej: falta de pago)"
        aria-label="Motivo de la suspensión"
        className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => setAbierto(false)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
          Cancelar
        </button>
        <button type="submit" disabled={cargando} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60">
          {cargando ? "Suspendiendo…" : "Sí, suspender"}
        </button>
      </div>
    </form>
  );
}
