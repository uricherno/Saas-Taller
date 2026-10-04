import Link from "next/link";
import { obtenerSesion } from "@/lib/sesion";
import { cerrarSesion } from "@/app/(auth)/actions";
import Navegacion from "./navegacion";

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const { usuario, taller } = await obtenerSesion();

  return (
    <div className="flex flex-1 flex-col bg-slate-50 print:bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/inicio" className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{taller?.nombre ?? "Mi taller"}</p>
            <p className="truncate text-sm text-slate-500">{usuario.nombre}</p>
          </Link>
          <form action={cerrarSesion}>
            <button
              type="submit"
              className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
        <Navegacion />
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
