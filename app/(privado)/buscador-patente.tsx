"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { ResultadoPatente } from "@/app/api/buscar-patente/route";

export default function BuscadorPatente() {
  const router = useRouter();
  const listaId = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoPatente[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(0);

  const termino = q.replace(/[\s.-]/g, "");

  // Buscar mientras se escribe (con una pequeña espera para no consultar en cada tecla).
  useEffect(() => {
    if (termino.length < 2) return;
    const control = new AbortController();
    const espera = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await fetch(`/api/buscar-patente?q=${encodeURIComponent(termino)}`, { signal: control.signal });
        const json = await r.json();
        setResultados(json.resultados ?? []);
        setActivo(0);
      } catch {
        // búsqueda cancelada o sin conexión: no mostrar nada nuevo
      } finally {
        if (!control.signal.aborted) setCargando(false);
      }
    }, 250);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [termino]);

  // Cerrar al tocar afuera.
  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  function ir(r: ResultadoPatente) {
    setAbierto(false);
    setQ("");
    setResultados([]);
    router.push(`/vehiculos/${r.id}`);
  }

  const visibles = termino.length >= 2 ? resultados : [];
  const mostrarLista = abierto && termino.length >= 2;

  return (
    <div ref={contenedor} className="relative">
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((i) => Math.min(i + 1, visibles.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter" && visibles[activo]) {
            e.preventDefault();
            ir(visibles[activo]);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
        placeholder="Buscar patente…"
        aria-label="Buscar vehículo por patente"
        role="combobox"
        aria-expanded={mostrarLista}
        aria-controls={listaId}
        autoComplete="off"
        autoCapitalize="characters"
        className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-base text-slate-900 uppercase placeholder:text-slate-400 placeholder:normal-case focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
      />

      {mostrarLista && (
        <ul
          id={listaId}
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {visibles.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">
              {cargando ? "Buscando…" : "No hay vehículos con esa patente."}
            </li>
          ) : (
            visibles.map((r, i) => (
              <li key={r.id} role="option" aria-selected={i === activo}>
                <button
                  type="button"
                  onClick={() => ir(r)}
                  onMouseEnter={() => setActivo(i)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left ${i === activo ? "bg-blue-50" : ""}`}
                >
                  <span className="shrink-0 rounded-md border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-sm font-semibold tracking-wider text-slate-900">
                    {r.patente}
                  </span>
                  <span className="min-w-0 truncate text-sm text-slate-600">
                    {[r.auto, r.cliente].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
