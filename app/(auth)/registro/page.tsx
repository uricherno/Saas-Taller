import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerInvitacion } from "@/lib/invitaciones";
import { labelRol } from "@/lib/permisos";
import { cerrarSesion } from "../actions";
import { Alerta, TarjetaAuth } from "@/components/ui";
import FormRegistro from "./form-registro";

export const metadata: Metadata = { title: "Registro" };

const pieLogin = (
  <>
    ¿Ya tenés cuenta?{" "}
    <Link href="/login" className="font-semibold text-blue-600 hover:underline">
      Iniciá sesión
    </Link>
  </>
);

export default async function RegistroPage({ searchParams }: PageProps<"/registro">) {
  const { invitacion } = await searchParams;

  // Registro normal: crea un taller nuevo.
  if (typeof invitacion !== "string" || !invitacion) {
    return (
      <TarjetaAuth titulo="Registrá tu taller" subtitulo="Creá la cuenta para empezar a gestionar tu taller" pie={pieLogin}>
        <FormRegistro />
      </TarjetaAuth>
    );
  }

  // Registro con invitación: se une a un taller existente.
  const info = await obtenerInvitacion(invitacion);
  if (!info) {
    return (
      <TarjetaAuth titulo="Invitación no válida" subtitulo="No pudimos usar este enlace" pie={pieLogin}>
        <Alerta tipo="error">
          La invitación ya se usó, venció o fue borrada. Pedile al dueño del taller que te mande una nueva.
        </Alerta>
      </TarjetaAuth>
    );
  }

  // Si hay alguien logueado en este navegador (por ej. el dueño probando el enlace),
  // primero tiene que cerrar sesión.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    return (
      <TarjetaAuth titulo={`Unite a ${info.taller_nombre}`} subtitulo="Invitación para crear tu usuario" pie={pieLogin}>
        <div className="space-y-4">
          <Alerta tipo="error">
            Ya hay una sesión iniciada en este navegador ({String(data.claims.email ?? "")}). Cerrala para aceptar la
            invitación de {info.email}.
          </Alerta>
          <form action={cerrarSesion}>
            <input type="hidden" name="volver" value={`/registro?invitacion=${invitacion}`} />
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700"
            >
              Cerrar sesión y continuar
            </button>
          </form>
        </div>
      </TarjetaAuth>
    );
  }

  return (
    <TarjetaAuth
      titulo={`Unite a ${info.taller_nombre}`}
      subtitulo="Creá tu usuario para empezar a trabajar en el taller"
      pie={pieLogin}
    >
      <FormRegistro
        invitacion={{ token: invitacion, email: info.email, tallerNombre: info.taller_nombre, rolLabel: labelRol(info.rol) }}
      />
    </TarjetaAuth>
  );
}
