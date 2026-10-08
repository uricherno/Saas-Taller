"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/ordenes", label: "Órdenes" },
  { href: "/cobros", label: "Cobros" },
  { href: "/precios", label: "Precios" },
  { href: "/seguimientos", label: "Seguimientos" },
  { href: "/presupuestos", label: "Presupuestos" },
  { href: "/recordatorios", label: "Recordatorios" },
  { href: "/reactivacion", label: "Reactivación" },
];

/** `extras`: pestañas que dependen del rol (ej: Equipo y Ajustes, solo para el dueño). */
export default function Navegacion({ extras = [] }: { extras?: { href: string; label: string }[] }) {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
      {[...ITEMS, ...extras].map(({ href, label }) => {
        // Las fichas de vehículos se consideran parte de "Clientes".
        const activo =
          pathname.startsWith(href) || (href === "/clientes" && pathname.startsWith("/vehiculos"));
        return (
          <Link
            key={href}
            href={href}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              activo
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
