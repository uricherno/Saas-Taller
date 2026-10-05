"use client";

import Link from "next/link";
import { useActionState } from "react";
import { iniciarSesion, type EstadoForm } from "../actions";
import { Alerta, BotonEnviar, Campo } from "@/components/ui";

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
      <div>
        <Campo
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Link href="/recuperar" className="mt-1.5 inline-block text-sm font-medium text-blue-600 hover:underline">
          Olvidé mi contraseña
        </Link>
      </div>
      <BotonEnviar cargando={cargando}>Ingresar</BotonEnviar>
    </form>
  );
}
