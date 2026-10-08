"use client";

import { useState, useTransition } from "react";
import { formatoPesos } from "@/lib/ordenes";
import { anularLinkPublico, crearLinkPublico } from "@/app/(privado)/ordenes/link-actions";
import BotonWhatsapp from "@/components/boton-whatsapp";

export type DatosLink = {
  url: string;
  visto: string | null;
  aceptado: string | null;
  totalAceptado: number | string | null;
};

/**
 * Link para que el cliente vea la orden desde el celular, sin cuenta, y acepte
 * el presupuesto. Se puede anular y generar uno nuevo.
 */
export default function LinkPublico({
  ordenId,
  link,
  puedeGestionar,
  cliente,
  mensaje,
}: {
  ordenId: string;
  link: DatosLink | null;
  puedeGestionar: boolean;
  cliente: { id: string; telefono: string | null; vehiculoId?: string | null } | null;
  /** Texto del WhatsApp; el link se agrega al final. */
  mensaje: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [confirmarAnular, setConfirmarAnular] = useState(false);
  const [pendiente, startTransition] = useTransition();

  const ejecutar = (accion: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      setError(null);
      const r = await accion();
      if (r.error) setError(r.error);
      setConfirmarAnular(false);
    });

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div>
        <h2 className="font-semibold text-slate-900">Link para el cliente</h2>
        <p className="text-sm text-slate-500">
          El cliente ve esta orden desde el celular, sin crear cuenta, y puede aceptar el presupuesto.
        </p>
      </div>

      {link?.aceptado && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          ✓ El cliente aceptó el presupuesto el {link.aceptado}
          {link.totalAceptado != null && <> por {formatoPesos(link.totalAceptado)}</>}.
        </p>
      )}

      {!link ? (
        puedeGestionar ? (
          <button
            type="button"
            disabled={pendiente}
            onClick={() => ejecutar(() => crearLinkPublico(ordenId))}
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {pendiente ? "Creando…" : "Crear link"}
          </button>
        ) : (
          <p className="text-sm text-slate-500">Todavía no se creó el link.</p>
        )
      ) : (
        <div className="space-y-2">
          <input
            readOnly
            value={link.url}
            onFocus={(e) => e.target.select()}
            aria-label="Link público de la orden"
            className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
          />
          <p className="text-xs text-slate-500">{link.visto ? `El cliente lo abrió por última vez el ${link.visto}.` : "El cliente todavía no lo abrió."}</p>
          <div className="flex flex-wrap items-start gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link.url);
                  setCopiado(true);
                  setTimeout(() => setCopiado(false), 2000);
                } catch {
                  // sin permiso de portapapeles: se puede copiar del campo
                }
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              {copiado ? "¡Copiado!" : "Copiar link"}
            </button>
            {puedeGestionar && cliente && (
              <BotonWhatsapp
                telefono={cliente.telefono}
                mensaje={`${mensaje}\n\nPodés verlo acá: ${link.url}`}
                clienteId={cliente.id}
                vehiculoId={cliente.vehiculoId}
                registro="Se envió el link de la orden por WhatsApp."
              >
                Mandar link por WhatsApp
              </BotonWhatsapp>
            )}
            {puedeGestionar &&
              (confirmarAnular ? (
                <span className="inline-flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-red-700">¿Anular? El link actual deja de funcionar.</span>
                  <button
                    type="button"
                    disabled={pendiente}
                    onClick={() => ejecutar(() => anularLinkPublico(ordenId))}
                    className="rounded-lg bg-red-600 px-3 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  >
                    Sí, anular
                  </button>
                  <button type="button" onClick={() => setConfirmarAnular(false)} className="font-medium text-slate-600 underline">
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmarAnular(true)}
                  className="rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Anular link
                </button>
              ))}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </section>
  );
}
