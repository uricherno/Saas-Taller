import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cerrarSesion } from "@/app/(auth)/actions";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage() {
  const supabase = await createClient();

  // Segunda barrera además del proxy: nunca renderizar sin usuario válido.
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  // RLS limita estas lecturas a los datos del propio usuario/taller.
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("nombre, email, talleres(nombre)")
    .eq("id", userId)
    .maybeSingle();

  const taller = Array.isArray(usuario?.talleres) ? usuario.talleres[0] : usuario?.talleres;

  return (
    <div className="flex flex-1 flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">
              {taller?.nombre ?? "Mi taller"}
            </p>
            <p className="truncate text-sm text-slate-500">{usuario?.nombre}</p>
          </div>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        {error || !usuario ? (
          <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No pudimos cargar los datos de tu taller. Si te acabás de registrar, esperá unos segundos y recargá la página.
          </p>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h1 className="text-2xl font-bold text-slate-900">¡Hola, {usuario.nombre}!</h1>
            <p className="mt-2 text-slate-600">
              Bienvenido al panel de <span className="font-semibold">{taller?.nombre}</span>.
            </p>
            <p className="mt-4 text-sm text-slate-500">Sesión iniciada como {usuario.email}</p>
          </div>
        )}
      </main>
    </div>
  );
}
