"use client";

import { startTransition, useActionState, useState, useTransition } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { formatoPesos } from "@/lib/ordenes";
import { Alerta, Campo, Selector } from "@/components/ui";
import { cambiarActivoPrecio, guardarPrecio, procesarLista, type ResultadoCarga } from "./actions";

const TIPOS = [
  { valor: "repuesto", label: "Repuesto" },
  { valor: "mano_de_obra", label: "Mano de obra" },
];

const BOTON_PRIMARIO =
  "rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60";
const BOTON_SECUNDARIO =
  "rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60";

// ─── Subir lista ──────────────────────────────────────────────────────────

/** Subir un Excel/CSV: primero muestra qué cambiaría y recién después aplica. */
export function FormCargaLista() {
  const [estado, despachar, cargando] = useActionState<ResultadoCarga, FormData>(procesarLista, {});
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("modo", (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? "vista_previa");
    // Envío manual: así el formulario no se vacía y el archivo sigue elegido para "Aplicar".
    startTransition(() => despachar(fd));
  }

  const vistaPrevia = estado.modo === "vista_previa" && !estado.error;

  return (
    <form onSubmit={enviar} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Archivo (.xlsx o .csv)</span>
        <input
          type="file"
          name="archivo"
          accept=".xlsx,.csv,.txt,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          required
          onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
        />
      </label>
      <p className="text-xs text-slate-500">
        Necesita una fila de títulos con <strong>Descripción</strong> y <strong>Precio</strong>. Si tiene{" "}
        <strong>Código</strong>, los precios se actualizan por código; si no, por descripción. <strong>Tipo</strong>{" "}
        (repuesto / mano de obra) es opcional. Sirven las listas de proveedores tal como vienen.
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Selector label="Si no dice el tipo, usar" name="tipo_defecto" opciones={TIPOS} defaultValue="repuesto" />
        <label className="flex items-start gap-2 self-end pb-2 text-sm text-slate-700">
          <input type="checkbox" name="desactivar_faltantes" className="mt-0.5 h-5 w-5 shrink-0 accent-blue-600" />
          <span>Desactivar los ítems que no vienen en el archivo (no se borran)</span>
        </label>
      </div>

      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}

      {estado.modo && !estado.error && <ResumenCarga r={estado} />}

      <div className="flex flex-wrap gap-2">
        <button type="submit" value="vista_previa" disabled={cargando || !nombreArchivo} className={vistaPrevia ? BOTON_SECUNDARIO : BOTON_PRIMARIO}>
          {cargando ? "Procesando…" : vistaPrevia ? "Revisar de nuevo" : "Revisar archivo"}
        </button>
        {vistaPrevia && (
          <button type="submit" value="aplicar" disabled={cargando} className={BOTON_PRIMARIO}>
            {cargando ? "Guardando…" : `Aplicar cambios (${(estado.nuevos ?? 0) + (estado.actualizados ?? 0)})`}
          </button>
        )}
      </div>
    </form>
  );
}

function ResumenCarga({ r }: { r: ResultadoCarga }) {
  const aplicado = r.modo === "aplicado";
  return (
    <div className={`space-y-3 rounded-xl border p-4 text-sm ${aplicado ? "border-green-200 bg-green-50" : "border-blue-200 bg-blue-50"}`}>
      <p className="font-semibold text-slate-900">
        {aplicado ? `✓ Lista actualizada con “${r.archivo}”` : `Vista previa de “${r.archivo}” (todavía no se guardó nada)`}
      </p>
      {r.columnas && (
        <p className="text-slate-600">
          Columnas usadas: descripción = <em>{r.columnas.descripcion}</em>, precio = <em>{r.columnas.precio}</em>
          {r.columnas.codigo ? <>, código = <em>{r.columnas.codigo}</em></> : ", sin código (se usa la descripción)"}
          {r.columnas.tipo && <>, tipo = <em>{r.columnas.tipo}</em></>}.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <li className="rounded-lg bg-white p-2"><span className="block text-lg font-bold text-slate-900">{r.nuevos}</span>nuevos</li>
        <li className="rounded-lg bg-white p-2"><span className="block text-lg font-bold text-slate-900">{r.actualizados}</span>con cambios</li>
        <li className="rounded-lg bg-white p-2"><span className="block text-lg font-bold text-slate-900">{r.sinCambios}</span>iguales</li>
        <li className="rounded-lg bg-white p-2">
          <span className="block text-lg font-bold text-slate-900">{aplicado ? r.desactivados : r.faltantes}</span>
          {aplicado ? "desactivados" : "no vienen en el archivo"}
        </li>
      </ul>
      {r.variacionPromedio != null && (
        <p className="text-slate-700">
          Variación promedio de los precios que cambian:{" "}
          <strong className={r.variacionPromedio >= 0 ? "text-red-700" : "text-green-700"}>
            {r.variacionPromedio > 0 ? "+" : ""}
            {r.variacionPromedio.toLocaleString("es-AR")} %
          </strong>
        </p>
      )}
      {!aplicado && r.muestra && r.muestra.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-500">
              <tr><th className="py-1 pr-2">Código</th><th className="py-1 pr-2">Descripción</th><th className="py-1 pr-2 text-right">Antes</th><th className="py-1 text-right">Ahora</th></tr>
            </thead>
            <tbody>
              {r.muestra.map((m) => (
                <tr key={m.codigo} className="border-t border-blue-100">
                  <td className="py-1 pr-2 font-mono">{m.codigo}</td>
                  <td className="py-1 pr-2">{m.descripcion}</td>
                  <td className="py-1 pr-2 text-right whitespace-nowrap">{m.antes == null ? <em>nuevo</em> : formatoPesos(m.antes)}</td>
                  <td className="py-1 text-right font-semibold whitespace-nowrap">{formatoPesos(m.despues)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(r.nuevos ?? 0) + (r.actualizados ?? 0) > r.muestra.length && (
            <p className="mt-1 text-xs text-slate-500">Se muestran los primeros {r.muestra.length} cambios.</p>
          )}
        </div>
      )}
      {r.avisos && r.avisos.length > 0 && (
        <details className="text-amber-900">
          <summary className="cursor-pointer font-medium">{r.avisos.length} filas con problemas (se saltean)</summary>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
            {r.avisos.map((a) => <li key={a}>{a}</li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

// ─── Alta / edición manual ───────────────────────────────────────────────

export function FormPrecio({
  id,
  inicial,
  alTerminar,
}: {
  id: string | null;
  inicial?: { codigo: string; descripcion: string; tipo: string; precio: number | string };
  alTerminar?: () => void;
}) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(async (prev, fd) => {
    const r = await guardarPrecio(id, prev, fd);
    if (r.exito) alTerminar?.();
    return r;
  }, {});
  const v = estado.valores ?? {
    codigo: inicial?.codigo ?? "",
    descripcion: inicial?.descripcion ?? "",
    tipo: inicial?.tipo ?? "repuesto",
    precio: inicial ? String(inicial.precio).replace(".", ",") : "",
  };
  return (
    <form action={enviar} className="space-y-3" key={JSON.stringify(estado)}>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      {estado.exito && !id && <Alerta tipo="exito">{estado.exito}</Alerta>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[8rem_1fr]">
        <Campo label="Código" name="codigo" required maxLength={60} defaultValue={v.codigo} placeholder="FIL-01" />
        <Campo label="Descripción" name="descripcion" required maxLength={300} defaultValue={v.descripcion} placeholder="Filtro de aceite" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
        <Selector label="Tipo" name="tipo" opciones={TIPOS} defaultValue={v.tipo} />
        <Campo label="Precio ($)" name="precio" required inputMode="decimal" defaultValue={v.precio} placeholder="15000" />
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          {alTerminar && id && (
            <button type="button" onClick={alTerminar} className={BOTON_SECUNDARIO}>
              Cancelar
            </button>
          )}
          <button type="submit" disabled={cargando} className={BOTON_PRIMARIO}>
            {cargando ? "Guardando…" : id ? "Guardar" : "Agregar"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Fila de la lista ─────────────────────────────────────────────────────

export type ItemLista = {
  id: string;
  codigo: string;
  descripcion: string;
  tipo: string;
  precio: number | string;
  activo: boolean;
  actualizado: string;
  /** Precio anterior y fecha del cambio (del historial). */
  anterior: { precio: number; fecha: string } | null;
  historial: { precio: number; fecha: string }[];
};

export function FilaPrecio({ item, puedeEditar }: { item: ItemLista; puedeEditar: boolean }) {
  const [modo, setModo] = useState<"ver" | "editar" | "historial">("ver");
  const [cambiando, startCambio] = useTransition();
  const variacion =
    item.anterior && item.anterior.precio > 0
      ? Math.round((Number(item.precio) / item.anterior.precio - 1) * 1000) / 10
      : null;

  return (
    <li className={`px-4 py-3 ${item.activo ? "" : "bg-slate-50 text-slate-400"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {item.descripcion}
            {!item.activo && <span className="ml-2 text-xs font-normal text-slate-500">(desactivado)</span>}
          </p>
          <p className="text-xs text-slate-500">
            <span className="font-mono">{item.codigo}</span> · {item.tipo === "mano_de_obra" ? "Mano de obra" : "Repuesto"} ·
            actualizado {item.actualizado}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-semibold text-slate-900">{formatoPesos(item.precio)}</p>
          {item.anterior && (
            <p className="text-xs text-slate-500">
              antes {formatoPesos(item.anterior.precio)}
              {variacion != null && (
                <span className={variacion >= 0 ? "text-red-600" : "text-green-700"}>
                  {" "}({variacion > 0 ? "+" : ""}{variacion.toLocaleString("es-AR")} %)
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-3 text-sm">
        {item.historial.length > 1 && (
          <button type="button" onClick={() => setModo(modo === "historial" ? "ver" : "historial")} className="font-medium text-blue-600 hover:underline">
            {modo === "historial" ? "Ocultar historial" : `Historial (${item.historial.length})`}
          </button>
        )}
        {puedeEditar && (
          <>
            <button type="button" onClick={() => setModo(modo === "editar" ? "ver" : "editar")} className="font-medium text-blue-600 hover:underline">
              Editar
            </button>
            <button
              type="button"
              disabled={cambiando}
              onClick={() => startCambio(async () => void (await cambiarActivoPrecio(item.id, !item.activo)))}
              className="font-medium text-slate-600 hover:underline disabled:opacity-60"
            >
              {item.activo ? "Desactivar" : "Activar"}
            </button>
          </>
        )}
      </div>

      {modo === "historial" && (
        <ol className="mt-2 space-y-0.5 border-l-2 border-slate-200 pl-3 text-sm">
          {item.historial.map((h, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span className="text-slate-500">{h.fecha}</span>
              <span className="font-medium text-slate-800">{formatoPesos(h.precio)}</span>
            </li>
          ))}
        </ol>
      )}
      {modo === "editar" && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
          <FormPrecio id={item.id} inicial={item} alTerminar={() => setModo("ver")} />
        </div>
      )}
    </li>
  );
}
