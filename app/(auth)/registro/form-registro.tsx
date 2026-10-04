"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registrarse, type EstadoForm } from "../actions";
import { Alerta, BotonEnviar, Campo } from "../componentes";

export default function FormRegistro() {
  const [estado, accion, cargando] = useActionState<EstadoForm, FormData>(registrarse, {});

  if (estado.exito) {
    return (
      <div className="space-y-4">
        <Alerta tipo="exito">{estado.exito}</Alerta>
        <Link
          href="/login"
          className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-700"
        >
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  const v = estado.valores;

  return (
    <form action={accion} className="space-y-4">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Campo
        label="Nombre del taller"
        name="taller_nombre"
        autoComplete="organization"
        required
        defaultValue={v?.taller_nombre}
        placeholder="Ej: Taller Mecánico Rodríguez"
      />
      <Campo
        label="Tu nombre"
        name="nombre"
        autoComplete="name"
        required
        defaultValue={v?.nombre}
        placeholder="Ej: Juan Rodríguez"
      />
      <Campo
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={v?.email}
        placeholder="tu@email.com"
      />
      <Campo
        label="Contraseña"
        name="password"
        type="password"
        autoComplete="new-password"
        minLength={6}
        required
        placeholder="Mínimo 6 caracteres"
      />
      <BotonEnviar cargando={cargando}>Crear cuenta</BotonEnviar>
    </form>
  );
}
