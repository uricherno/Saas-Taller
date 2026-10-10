"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/ordenes";
import { cambiarEstadoOrden } from "@/app/(privado)/ordenes/actions";

/**
 * Estado de la orden con un toque: en revisión → presupuestado → en proceso →
 * terminado → entregado. El cliente lo ve en su link.
 */
export default function CambiarEstado({ ordenId, estado, puedeEditar }: { ordenId: string; estado: string; puedeEditar: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [cargando, startTransition] = useTransition();

  return (
    <section className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
      <h2 className="text-sm font-semibold text-slate-700">Estado de la orden</h2>
      <div role="radiogroup" aria-label="Estado de la orden" className="flex flex-wrap gap-2">
        {ESTADOS.map((e) => {
          const actual = e.valor === estado;
          return (
            <button
              key={e.valor}
              type="button"
              role="radio"
              aria-checked={actual}
              disabled={!puedeEditar || cargando || actual}
              onClick={() => {
                if (e.valor === "cancelado" && !confirm("¿Cancelar esta orden?")) return;
                setError(null);
                startTransition(async () => {
                  const r = await cambiarEstadoOrden(ordenId, e.valor);
                  if (r.error) setError(r.error);
                  router.refresh();
                });
              }}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition disabled:cursor-default ${
                actual ? `${e.color} ring-2 ring-current` : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              }`}
            >
              {e.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <p className="text-xs text-slate-500">El cliente ve el estado actualizado en su link.</p>
    </section>
  );
}
