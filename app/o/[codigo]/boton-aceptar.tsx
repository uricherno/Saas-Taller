"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { formatoPesos } from "@/lib/ordenes";
import { Alerta } from "@/components/ui";
import { aceptarPresupuesto } from "./actions";

export default function BotonAceptar({ codigo, total }: { codigo: string; total: number | string | null }) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, enviar, cargando] = useActionState<EstadoForm>(() => aceptarPresupuesto(codigo), {});

  if (estado.exito) return <Alerta tipo="exito">{estado.exito}</Alerta>;

  return (
    <div className="space-y-3">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      {!confirmando ? (
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="w-full rounded-lg bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700"
        >
          Aceptar presupuesto
        </button>
      ) : (
        <form action={enviar} className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-900">
            ¿Confirmás que aceptás el presupuesto por <strong>{formatoPesos(total)}</strong>? El taller va a recibir el aviso.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={cargando}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {cargando ? "Enviando…" : "Sí, acepto"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
