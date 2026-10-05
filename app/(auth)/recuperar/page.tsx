import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaAuth } from "@/components/ui";
import FormRecuperar from "./form-recuperar";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default async function RecuperarPage({ searchParams }: PageProps<"/recuperar">) {
  const { mensaje } = await searchParams;
  const aviso =
    mensaje === "enlace_invalido"
      ? "El enlace para cambiar la contraseña no es válido o ya venció. Pedí uno nuevo."
      : undefined;

  return (
    <TarjetaAuth
      titulo="Recuperar contraseña"
      subtitulo="Te mandamos un enlace por email para elegir una nueva"
      pie={
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      <FormRecuperar aviso={aviso} />
    </TarjetaAuth>
  );
}
