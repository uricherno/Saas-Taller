import Link from "next/link";
import { obtenerSesion } from "@/lib/sesion";
import { labelRol, puede } from "@/lib/permisos";
import { cerrarSesion } from "@/app/(auth)/actions";
import BuscadorPatente from "./buscador-patente";
import Navegacion from "./navegacion";

export default async function LayoutPrivado({ children }: { children: React.ReactNode }) {
  const { usuario, taller, rol } = await obtenerSesion();
  // Solo comodidad visual: la base de datos igual bloquea lo que el rol no puede hacer.
  const extras = [
    ...(puede(rol, "equipo") ? [{ href: "/equipo", label: "Equipo" }] : []),
    ...(puede(rol, "ajustes") ? [{ href: "/ajustes", label: "Ajustes" }] : []),
  ];

  return (
    <div className="flex flex-1 flex-col bg-slate-50 print:bg-white">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white print:hidden">
        {/* En celular: nombre + botones arriba y el buscador abajo. En pantallas grandes, todo en una fila. */}
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <Link href="/inicio" className="order-1 min-w-0 flex-1 sm:flex-none">
            <p className="truncate font-semibold text-slate-900">{taller?.nombre ?? "Mi taller"}</p>
            <p className="truncate text-sm text-slate-500">
              {usuario.nombre} · <span className="font-medium text-slate-600">{labelRol(rol)}</span>
            </p>
          </Link>
          <div className="order-3 w-full sm:order-2 sm:w-auto sm:max-w-xs sm:flex-1">
            <BuscadorPatente />
          </div>
          <div className="order-2 flex shrink-0 items-center gap-2 sm:order-3 sm:ml-auto">
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
        <Navegacion extras={extras} />
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
