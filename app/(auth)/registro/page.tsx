import type { Metadata } from "next";
import Link from "next/link";
import { TarjetaAuth } from "@/components/ui";
import FormRegistro from "./form-registro";

export const metadata: Metadata = { title: "Registrar taller" };

export default function RegistroPage() {
  return (
    <TarjetaAuth
      titulo="Registrá tu taller"
      subtitulo="Creá la cuenta para empezar a gestionar tu taller"
      pie={
        <>
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Iniciá sesión
          </Link>
        </>
      }
    >
      <FormRegistro />
    </TarjetaAuth>
  );
}
