import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaAuth } from "@/components/ui";
import FormLogin from "./form-login";

export const metadata: Metadata = { title: "Iniciar sesión" };

const MENSAJES: Record<string, string> = {
  confirmado: "¡Email confirmado! Ya podés iniciar sesión.",
  enlace_invalido: "El enlace de confirmación no es válido o ya venció. Probá iniciar sesión o registrate de nuevo.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { mensaje } = await searchParams;
  const aviso = typeof mensaje === "string" ? MENSAJES[mensaje] : undefined;

  return (
    <TarjetaAuth
      titulo="Iniciar sesión"
      subtitulo="Entrá a la cuenta de tu taller"
      pie={
        <>
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-semibold text-blue-600 hover:underline">
            Registrá tu taller
          </Link>
        </>
      }
    >
      <FormLogin aviso={aviso} esError={mensaje === "enlace_invalido"} />
    </TarjetaAuth>
  );
}
