"use client";

import { useMemo, useState } from "react";
import { CATALOGO_FALLAS, normalizarBusqueda } from "@/lib/catalogo-fallas";

/**
 * Lista de trabajos y fallas frecuentes, agrupada por categoría y con buscador.
 * Al tocar una opción se llama a `alElegir` (por ejemplo, para sumarla a la descripción).
 */
export default function SelectorFallas({ alElegir }: { alElegir: (item: string) => void }) {
  const [abierto, setAbierto] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoria, setCategoria] = useState<string | null>(null);

  const filtradas = useMemo(() => {
    const q = normalizarBusqueda(busqueda);
    return CATALOGO_FALLAS.map((c) => ({
      ...c,
      items: c.items.filter((i) => !q || normalizarBusqueda(i).includes(q)),
    })).filter((c) => c.items.length && (q || !categoria || c.categoria === categoria));
  }, [busqueda, categoria]);

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="text-sm font-medium text-blue-600 hover:underline"
      >
        + Elegir de la lista de trabajos y fallas frecuentes
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center gap-2">
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar: pastillas, embrague, recalienta…"
          aria-label="Buscar trabajo o falla"
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="shrink-0 rounded-lg px-2 py-2 text-sm text-slate-500 hover:bg-slate-200"
        >
          Cerrar
        </button>
      </div>

      {!busqueda && (
        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {[null, ...CATALOGO_FALLAS.map((c) => c.categoria)].map((c) => (
            <button
              key={c ?? "todas"}
              type="button"
              onClick={() => setCategoria(c)}
              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                categoria === c ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {c ?? "Todas"}
            </button>
          ))}
        </div>
      )}

      <div className="max-h-72 space-y-3 overflow-y-auto">
        {filtradas.length === 0 && (
          <p className="text-sm text-slate-500">No está en la lista. Escribilo directamente en la descripción.</p>
        )}
        {filtradas.map((c) => (
          <div key={c.categoria}>
            <p className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">{c.categoria}</p>
            <div className="flex flex-wrap gap-1.5">
              {c.items.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => alElegir(i)}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 hover:border-blue-500 hover:bg-blue-50"
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500">Cada opción que tocás se suma a la descripción. Después la podés editar.</p>
    </div>
  );
}
