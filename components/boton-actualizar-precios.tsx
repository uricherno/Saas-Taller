"use client";

import { useState, useTransition } from "react";
import { actualizarPreciosOrden } from "@/app/(privado)/ordenes/actions";

/** Pasa los items vinculados a la lista al precio vigente. */
export default function BotonActualizarPrecios({ ordenId }: { ordenId: string }) {
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [actualizando, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={actualizando}
        onClick={() =>
          startTransition(async () => {
            const r = await actualizarPreciosOrden(ordenId);
            setMensaje(r.error ?? r.exito ?? null);
          })
        }
        className="rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
      >
        {actualizando ? "Actualizando…" : "Actualizar a precios de hoy"}
      </button>
      {mensaje && <span className="text-sm text-slate-700">{mensaje}</span>}
    </span>
  );
}
