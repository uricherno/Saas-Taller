import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Solo se permite volver a rutas internas ("/algo"), nunca a otro sitio. */
function destinoSeguro(next: string | null, porDefecto: string) {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : porDefecto;
}

// Destino de los enlaces que manda Supabase por email (confirmar cuenta, recuperar clave).
// Soporta el flujo PKCE (?code=) y el de token_hash (?token_hash=&type=).
// ?next= indica a dónde ir después (ej: /nueva-clave al recuperar la contraseña).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const destino = destinoSeguro(searchParams.get("next"), type === "recovery" ? "/nueva-clave" : "/inicio");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) return NextResponse.redirect(`${origin}${destino}`);
  }

  // El enlace se abrió en otro navegador/dispositivo, venció o ya se usó.
  const esRecuperacion = type === "recovery" || destino === "/nueva-clave";
  return NextResponse.redirect(
    `${origin}${esRecuperacion ? "/recuperar?mensaje=enlace_invalido" : "/login?mensaje=enlace_invalido"}`,
  );
}
