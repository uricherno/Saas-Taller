"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { Alerta } from "@/components/ui";

// Botón de borrar en dos pasos: primero pide confirmación y recién después elimina.
export default function BotonEliminar({
  accion,
  texto,
  pregunta,
}: {
  accion: () => Promise<EstadoForm>;
  texto: string;
  pregunta: string;
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [estado, enviar, cargando] = useActionState<EstadoForm>(accion, {});

  if (!confirmando) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirmando(true)}
          className="w-full rounded-lg border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 sm:w-auto"
        >
          {texto}
        </button>
      </div>
    );
  }

  return (
    <div role="alertdialog" className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">{pregunta}</p>
      <p className="text-sm text-red-700">Esta acción no se puede deshacer.</p>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <form action={enviar} className="flex flex-col-reverse gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => setConfirmando(false)}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {cargando ? "Eliminando…" : "Sí, eliminar"}
        </button>
      </form>
    </div>
  );
}
