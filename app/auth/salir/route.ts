import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Cierra la sesión y vuelve al login. Se usa cuando un usuario desactivado
// intenta entrar (los Server Components no pueden borrar cookies).
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const motivo = request.nextUrl.searchParams.get("motivo");
  const destino = new URL("/login", request.url);
  if (motivo === "desactivado") destino.searchParams.set("mensaje", "desactivado");
  return NextResponse.redirect(destino);
}
