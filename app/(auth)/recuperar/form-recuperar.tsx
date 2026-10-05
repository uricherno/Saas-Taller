"use client";

import { useActionState } from "react";
import { pedirRecuperacion, type EstadoForm } from "../actions";
import { Alerta, BotonEnviar, Campo } from "@/components/ui";

export default function FormRecuperar({ aviso }: { aviso?: string }) {
  const [estado, accion, cargando] = useActionState<EstadoForm, FormData>(pedirRecuperacion, {});

  if (estado.exito) return <Alerta tipo="exito">{estado.exito}</Alerta>;

  return (
    <form action={accion} className="space-y-4">
      {estado.error ? <Alerta tipo="error">{estado.error}</Alerta> : aviso && <Alerta tipo="error">{aviso}</Alerta>}
      <Campo
        label="Email de tu cuenta"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.valores?.email}
        placeholder="tu@email.com"
      />
      <BotonEnviar cargando={cargando}>Enviarme el enlace</BotonEnviar>
    </form>
  );
}
