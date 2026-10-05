"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registrarse, type EstadoForm } from "../actions";
import { Alerta, BotonEnviar, Campo } from "@/components/ui";

/** Con `invitacion`, la persona se une a un taller existente: no se pide nombre de taller. */
export default function FormRegistro({
  invitacion,
}: {
  invitacion?: { token: string; email: string; tallerNombre: string; rolLabel: string };
}) {
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

      {invitacion ? (
        <>
          <input type="hidden" name="invitacion" value={invitacion.token} />
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
            Te vas a unir a <span className="font-semibold">{invitacion.tallerNombre}</span> como{" "}
            <span className="font-semibold">{invitacion.rolLabel}</span>.
          </div>
        </>
      ) : (
        <Campo
          label="Nombre del taller"
          name="taller_nombre"
          autoComplete="organization"
          required
          defaultValue={v?.taller_nombre}
          placeholder="Ej: Taller Mecánico Rodríguez"
        />
      )}

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
        // La invitación es para un email puntual.
        readOnly={Boolean(invitacion)}
        defaultValue={invitacion?.email ?? v?.email}
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
      <label className="flex items-start gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="acepto"
          required
          className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 accent-blue-600"
        />
        <span>
          Leí y acepto los{" "}
          <Link href="/terminos" target="_blank" className="font-medium text-blue-600 underline">
            Términos y condiciones
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="font-medium text-blue-600 underline">
            Política de privacidad
          </Link>
          .
        </span>
      </label>
      <BotonEnviar cargando={cargando}>{invitacion ? "Unirme al taller" : "Crear cuenta"}</BotonEnviar>
    </form>
  );
}
