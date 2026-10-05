"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { linkWhatsapp } from "@/lib/whatsapp";
import { registrarWhatsapp } from "@/app/(privado)/crm/actions";

type Props = {
  telefono: string | null | undefined;
  /** Mensaje que se abre ya escrito en WhatsApp (opcional). */
  mensaje?: string;
  clienteId: string;
  vehiculoId?: string | null;
  /** Texto que queda en la línea de tiempo. Por defecto, el mensaje enviado. */
  registro?: string;
  children?: React.ReactNode;
  className?: string;
  /** Acción extra después de registrar (ej: marcar un recordatorio). */
  alEnviar?: () => Promise<{ error?: string } | void>;
};

/**
 * Abre WhatsApp con el número limpio (formato argentino) y deja registrada la
 * interacción en la ficha del cliente. Si el teléfono no sirve, avisa en vez de abrir.
 */
export default function BotonWhatsapp({
  telefono,
  mensaje,
  clienteId,
  vehiculoId,
  registro,
  children = "WhatsApp",
  className,
  alEnviar,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [registrando, startTransition] = useTransition();
  const url = linkWhatsapp(telefono, mensaje);

  if (!url) {
    return (
      <span className="text-sm text-amber-700">
        {telefono?.trim() ? `Teléfono “${telefono}” no válido para WhatsApp` : "Sin teléfono"}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={registrando}
        onClick={() => {
          // Abrir dentro del clic (si no, el navegador lo bloquea) y después registrar.
          window.open(url, "_blank", "noopener,noreferrer");
          setError(null);
          startTransition(async () => {
            const r = await registrarWhatsapp({
              clienteId,
              vehiculoId,
              texto: registro ?? mensaje ?? "Se abrió una conversación de WhatsApp.",
            });
            const extra = r.error ? undefined : await alEnviar?.();
            const err = r.error ?? (extra && extra.error);
            if (err) setError(err);
            router.refresh();
          });
        }}
        className={
          className ??
          "inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60"
        }
      >
        {children}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
