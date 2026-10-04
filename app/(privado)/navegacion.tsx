"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/inicio", label: "Inicio" },
  { href: "/clientes", label: "Clientes" },
  { href: "/ordenes", label: "Órdenes" },
];

export default function Navegacion() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto flex max-w-4xl gap-1 px-4">
      {ITEMS.map(({ href, label }) => {
        // Las fichas de vehículos se consideran parte de "Clientes".
        const activo =
          pathname.startsWith(href) || (href === "/clientes" && pathname.startsWith("/vehiculos"));
        return (
          <Link
            key={href}
            href={href}
            className={`border-b-2 px-3 py-2 text-sm font-medium ${
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
