"use client";

import { useState, useSyncExternalStore } from "react";
import { registrarPresupuestoEnviado } from "@/app/(privado)/crm/actions";

/** ¿El navegador puede compartir archivos? (celulares, sobre todo). Se calcula una vez. */
let compartirSoportado: boolean | null = null;
function detectarCompartir() {
  if (compartirSoportado === null) {
    try {
      const prueba = new File([""], "x.pdf", { type: "application/pdf" });
      compartirSoportado = typeof navigator.canShare === "function" && navigator.canShare({ files: [prueba] });
    } catch {
      compartirSoportado = false;
    }
  }
  return compartirSoportado;
}
const sinSuscripcion = () => () => {};

/**
 * "Descargar PDF" y, en celulares que lo permiten, "Compartir PDF" (abre el menú
 * del teléfono para mandarlo por WhatsApp como archivo adjunto).
 */
export default function BotonesPdf({
  ordenId,
  nombreArchivo,
  clienteId,
  vehiculoId,
  titulo,
}: {
  ordenId: string;
  nombreArchivo: string;
  clienteId: string | null;
  vehiculoId: string | null;
  titulo: string;
}) {
  const url = `/api/ordenes/${ordenId}/pdf`;
  // En el servidor no hay navigator: false. En el navegador, lo que soporte.
  const puedeCompartir = useSyncExternalStore(sinSuscripcion, detectarCompartir, () => false);
  const [estado, setEstado] = useState<"" | "preparando" | "listo" | "error">("");

  const registrar = (como: string) =>
    clienteId
      ? registrarPresupuestoEnviado({ clienteId, vehiculoId, texto: `${titulo} en PDF ${como}.` })
      : Promise.resolve({});

  async function compartir() {
    setEstado("preparando");
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      const archivo = new File([await r.blob()], nombreArchivo, { type: "application/pdf" });
      await navigator.share({ files: [archivo], title: titulo });
      await registrar("compartido");
      setEstado("listo");
    } catch (e) {
      // Si la persona cierra el menú de compartir no es un error.
      setEstado((e as Error)?.name === "AbortError" ? "" : "error");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <a
        href={url}
        download={nombreArchivo}
        onClick={() => void registrar("descargado")}
        className="inline-flex items-center justify-center rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900"
      >
        Descargar PDF
      </a>
      {puedeCompartir && (
        <button
          type="button"
          onClick={compartir}
          disabled={estado === "preparando"}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {estado === "preparando" ? "Preparando…" : "Compartir PDF"}
        </button>
      )}
      {estado === "error" && <span className="text-xs text-red-600">No se pudo compartir. Probá con “Descargar PDF”.</span>}
    </span>
  );
}
