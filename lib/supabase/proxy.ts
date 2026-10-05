import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Con sesión iniciada, estas redirigen a /inicio. (/nueva-clave no está: la usa la sesión de recuperación.)
const RUTAS_PUBLICAS_AUTH = ["/login", "/registro", "/recuperar"];
const RUTAS_PRIVADAS = [
  "/inicio", "/clientes", "/vehiculos", "/ordenes", "/seguimientos", "/presupuestos",
  "/recordatorios", "/reactivacion", "/ajustes", "/equipo",
];

function empiezaCon(pathname: string, rutas: string[]) {
  return rutas.some((r) => pathname === r || pathname.startsWith(`${r}/`));
}

// Refresca la sesión de Supabase en cada request y aplica las redirecciones.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            response.headers.set(key, value),
          );
        },
      },
    },
  );

  // No poner código entre createServerClient y getClaims():
  // getClaims() valida el JWT y dispara el refresco del token si hace falta.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname } = request.nextUrl;

  const redirigir = (destino: string) => {
    const url = request.nextUrl.clone();
    url.pathname = destino;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Conservar las cookies de sesión refrescadas.
    response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
    return redirect;
  };

  if (!user && (pathname === "/" || empiezaCon(pathname, RUTAS_PRIVADAS))) {
    return redirigir("/login");
  }

  // El enlace de invitación se muestra aunque haya sesión: la página ofrece cerrarla.
  const esInvitacion = pathname === "/registro" && request.nextUrl.searchParams.has("invitacion");

  if (user && !esInvitacion && (pathname === "/" || empiezaCon(pathname, RUTAS_PUBLICAS_AUTH))) {
    return redirigir("/inicio");
  }

  return response;
}
