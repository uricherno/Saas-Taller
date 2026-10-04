"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { Alerta, AreaTexto, BotonEnviar, BotonLink, Campo } from "@/components/ui";

type Cliente = { nombre: string; telefono: string | null; notas: string | null };

export default function FormCliente({
  accion,
  inicial,
  cancelarHref,
  textoBoton,
}: {
  accion: (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial?: Cliente;
  cancelarHref: string;
  textoBoton: string;
}) {
  const [estado, enviar, cargando] = useActionState(accion, {});
  // Si hubo error, mostrar lo que el usuario escribió; si no, los datos guardados.
  const v = estado.valores ?? {
    nombre: inicial?.nombre ?? "",
    telefono: inicial?.telefono ?? "",
    notas: inicial?.notas ?? "",
  };

  return (
    <form action={enviar} className="space-y-4" key={JSON.stringify(v)}>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Campo label="Nombre" name="nombre" required maxLength={120} defaultValue={v.nombre} placeholder="Ej: María González" />
      <Campo
        label="Teléfono (WhatsApp)"
        opcional
        name="telefono"
        type="tel"
        inputMode="tel"
        autoComplete="off"
        defaultValue={v.telefono}
        placeholder="Ej: +54 9 11 2345-6789"
      />
      <AreaTexto label="Notas" opcional name="notas" defaultValue={v.notas} placeholder="Preferencias, horarios, datos útiles…" />
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BotonLink href={cancelarHref} variante="secundario">
          Cancelar
        </BotonLink>
        <div className="sm:w-48">
          <BotonEnviar cargando={cargando}>{textoBoton}</BotonEnviar>
        </div>
      </div>
    </form>
  );
}
