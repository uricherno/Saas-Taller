"use client";

import { useActionState } from "react";
import { cambiarClave, type EstadoForm } from "../actions";
import { Alerta, BotonEnviar, Campo } from "@/components/ui";

export default function FormNuevaClave() {
  const [estado, accion, cargando] = useActionState<EstadoForm, FormData>(cambiarClave, {});

  return (
    <form action={accion} className="space-y-4">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Campo
        label="Nueva contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
        placeholder="Mínimo 6 caracteres"
      />
      <Campo
        label="Repetí la nueva contraseña"
        name="confirmacion"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
      />
      <BotonEnviar cargando={cargando}>Guardar contraseña</BotonEnviar>
    </form>
  );
}
