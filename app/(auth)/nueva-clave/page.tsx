import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Alerta, TarjetaAuth } from "@/components/ui";
import FormNuevaClave from "./form-nueva-clave";

export const metadata: Metadata = { title: "Nueva contraseña" };

// Se llega desde el enlace del email de recuperación, que inicia una sesión temporal.
export default async function NuevaClavePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;

  return (
    <TarjetaAuth
      titulo="Elegí una nueva contraseña"
      subtitulo={email ? `Para la cuenta ${email}` : "Recuperar el acceso a tu cuenta"}
      pie={
        <Link href="/login" className="font-semibold text-blue-600 hover:underline">
          Volver a iniciar sesión
        </Link>
      }
    >
      {data?.claims ? (
        <FormNuevaClave />
      ) : (
        <div className="space-y-4">
          <Alerta tipo="error">
            El enlace venció o ya se usó. Pedí uno nuevo y abrilo en este mismo navegador.
          </Alerta>
          <Link
            href="/recuperar"
            className="block w-full rounded-lg bg-blue-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-700"
          >
            Pedir un enlace nuevo
          </Link>
        </div>
      )}
    </TarjetaAuth>
  );
}
