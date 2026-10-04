"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoForm } from "../actions";
import { Alerta, BotonEnviar, Campo } from "../componentes";

export default function FormLogin({ aviso, esError }: { aviso?: string; esError?: boolean }) {
  const [estado, accion, cargando] = useActionState<EstadoForm, FormData>(iniciarSesion, {});

  return (
    <form action={accion} className="space-y-4">
      {estado.error ? (
        <Alerta tipo="error">{estado.error}</Alerta>
      ) : (
        aviso && <Alerta tipo={esError ? "error" : "exito"}>{aviso}</Alerta>
      )}
      <Campo
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={estado.valores?.email}
        placeholder="tu@email.com"
      />
      <Campo
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="current-password"
        required
      />
      <BotonEnviar cargando={cargando}>Ingresar</BotonEnviar>
    </form>
  );
}
