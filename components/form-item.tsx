"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { formatoPesos, TIPOS_ITEM } from "@/lib/ordenes";
import type { ResultadoPrecio } from "@/app/api/precios/route";
import { Alerta, BotonEnviar, Campo, Selector } from "@/components/ui";

/** Buscador en la lista de precios: al elegir un ítem, completa el formulario. */
function BuscadorLista({ alElegir }: { alElegir: (p: ResultadoPrecio) => void }) {
  const listaId = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [resultados, setResultados] = useState<ResultadoPrecio[]>([]);
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [activo, setActivo] = useState(0);

  useEffect(() => {
    const termino = q.trim();
    if (termino.length < 2) return;
    const control = new AbortController();
    const espera = setTimeout(async () => {
      setCargando(true);
      try {
        const r = await fetch(`/api/precios?q=${encodeURIComponent(termino)}`, { signal: control.signal });
        const json = await r.json();
        setResultados(json.resultados ?? []);
        setActivo(0);
      } catch {
        // búsqueda cancelada o sin conexión
      } finally {
        if (!control.signal.aborted) setCargando(false);
      }
    }, 250);
    return () => {
      clearTimeout(espera);
      control.abort();
    };
  }, [q]);

  useEffect(() => {
    const cerrar = (e: MouseEvent) => {
      if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
    };
    document.addEventListener("mousedown", cerrar);
    return () => document.removeEventListener("mousedown", cerrar);
  }, []);

  function elegir(p: ResultadoPrecio) {
    alElegir(p);
    setQ("");
    setResultados([]);
    setAbierto(false);
  }

  const visibles = q.trim().length >= 2 ? resultados : [];

  return (
    <div ref={contenedor} className="relative">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Buscar en la lista de precios</span>
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActivo((i) => Math.min(i + 1, visibles.length - 1)); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActivo((i) => Math.max(i - 1, 0)); }
            else if (e.key === "Enter" && visibles[activo]) { e.preventDefault(); elegir(visibles[activo]); }
            else if (e.key === "Escape") setAbierto(false);
          }}
          placeholder="Ej: filtro aceite, o un código"
          role="combobox"
          aria-expanded={abierto && visibles.length > 0}
          aria-controls={listaId}
          autoComplete="off"
          className="block w-full rounded-lg border border-blue-300 bg-blue-50/50 px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
        />
      </label>
      {abierto && q.trim().length >= 2 && (
        <ul id={listaId} role="listbox" className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {visibles.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500">{cargando ? "Buscando…" : "No está en la lista. Cargalo a mano abajo."}</li>
          ) : (
            visibles.map((p, i) => (
              <li key={p.id} role="option" aria-selected={i === activo}>
                <button
                  type="button"
                  onClick={() => elegir(p)}
                  onMouseEnter={() => setActivo(i)}
                  className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${i === activo ? "bg-blue-50" : ""}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-slate-900">{p.descripcion}</span>
                    <span className="text-xs text-slate-500">
                      <span className="font-mono">{p.codigo}</span> · {p.tipo === "mano_de_obra" ? "Mano de obra" : "Repuesto"}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-slate-900">{formatoPesos(p.precio)}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

const VACIO = { tipo: "repuesto", descripcion: "", cantidad: "1", precio: "", precioId: "", codigo: "" };

export default function FormItem({
  accion,
}: {
  accion: (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>;
}) {
  // Campos controlados: el buscador de la lista los completa.
  const [campos, setCampos] = useState(VACIO);
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(async (prev, fd) => {
    const r = await accion(prev, fd);
    // Al agregar bien, vaciar (conservando el tipo); si hubo error, dejar lo escrito.
    if (r.exito) setCampos((c) => ({ ...VACIO, tipo: c.tipo }));
    return r;
  }, {});

  const set = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setCampos((c) => ({ ...c, [k]: e.target.value }));

  return (
    <div className="space-y-3">
      <BuscadorLista
        alElegir={(p) =>
          setCampos((c) => ({
            ...c,
            tipo: p.tipo,
            descripcion: p.descripcion,
            precio: String(p.precio).replace(".", ","),
            precioId: p.id,
            codigo: p.codigo,
          }))
        }
      />

      <form action={enviar} className="space-y-3">
        {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
        <input type="hidden" name="precio_id" value={campos.precioId} />
        {campos.codigo && (
          <p className="flex items-center gap-2 text-xs text-blue-700">
            De la lista de precios: <span className="font-mono">{campos.codigo}</span>
            <button
              type="button"
              onClick={() => setCampos((c) => ({ ...c, precioId: "", codigo: "" }))}
              className="text-slate-500 underline"
            >
              desvincular
            </button>
          </p>
        )}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
          <Selector label="Tipo" name="tipo" opciones={TIPOS_ITEM} value={campos.tipo} onChange={set("tipo")} />
          <Campo
            label="Descripción"
            name="descripcion"
            required
            value={campos.descripcion}
            onChange={set("descripcion")}
            placeholder="Ej: Filtro de aceite"
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <Campo label="Cantidad" name="cantidad" inputMode="decimal" required value={campos.cantidad} onChange={set("cantidad")} />
          <Campo
            label="Precio unitario ($)"
            name="precio_unitario"
            inputMode="decimal"
            required
            value={campos.precio}
            onChange={set("precio")}
            placeholder="Ej: 15000"
          />
          <div className="col-span-2 sm:col-span-1 sm:w-40">
            <BotonEnviar cargando={cargando}>Agregar</BotonEnviar>
          </div>
        </div>
        {campos.codigo && <p className="text-xs text-slate-500">Podés cambiar la cantidad o el precio (por ejemplo, un descuento) antes de agregar.</p>}
      </form>
    </div>
  );
}
