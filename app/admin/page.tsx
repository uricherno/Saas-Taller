import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatoPesos } from "@/lib/ordenes";
import { Tarjeta } from "@/components/ui";
import { AccionesTaller } from "./componentes-admin";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

type FilaTaller = {
  id: string;
  nombre: string;
  telefono: string | null;
  creado_en: string | null;
  suspendido_en: string | null;
  suspendido_motivo: string | null;
  duenos: string | null;
  usuarios: number;
  clientes: number;
  ordenes: number;
  ordenes_30d: number;
  facturado_30d: number | string;
  ultima_orden: string | null;
  ultimo_ingreso: string | null;
};

const fecha = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" });
const f = (iso: string | null) => (iso ? fecha.format(new Date(iso)) : "—");

/** Días desde una fecha (para marcar talleres sin actividad). */
function diasDesde(iso: string | null) {
  return iso ? Math.floor((Date.now() - Date.parse(iso)) / 86_400_000) : null;
}

// Panel del dueño del SaaS. Solo lo ven los usuarios cargados en admins_saas
// (para cualquier otro, la página no existe).
export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");

  const { data: esAdmin } = await supabase.rpc("soy_admin_saas");
  if (esAdmin !== true) notFound();

  const { data, error } = await supabase.rpc("admin_talleres");
  const sp = await searchParams;
  const filtro = typeof sp.filtro === "string" ? sp.filtro : "todos";
  const todos = (data ?? []) as FilaTaller[];
  const talleres = todos.filter((t) =>
    filtro === "suspendidos" ? t.suspendido_en : filtro === "inactivos" ? !t.suspendido_en && (diasDesde(t.ultimo_ingreso) ?? 999) > 30 : true,
  );
  const activos30 = todos.filter((t) => (diasDesde(t.ultimo_ingreso) ?? 999) <= 30 && !t.suspendido_en).length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Administración</h1>
          <p className="text-sm text-slate-500">Talleres registrados, su actividad y suspensión.</p>
        </div>
        <Link href="/inicio" className="text-sm font-medium text-blue-600 hover:underline">
          Ir a la app
        </Link>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudo cargar la lista de talleres. ¿Está corrida la migración 20261014?
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Tarjeta>
              <p className="text-sm text-slate-500">Talleres</p>
              <p className="text-2xl font-bold text-slate-900">{todos.length}</p>
            </Tarjeta>
            <Tarjeta>
              <p className="text-sm text-slate-500">Activos (30 días)</p>
              <p className="text-2xl font-bold text-slate-900">{activos30}</p>
            </Tarjeta>
            <Tarjeta>
              <p className="text-sm text-slate-500">Suspendidos</p>
              <p className="text-2xl font-bold text-slate-900">{todos.filter((t) => t.suspendido_en).length}</p>
            </Tarjeta>
          </div>

          <nav className="flex gap-3 text-sm">
            {[
              ["todos", "Todos"],
              ["inactivos", "Sin ingresar hace +30 días"],
              ["suspendidos", "Suspendidos"],
            ].map(([valor, label]) => (
              <Link
                key={valor}
                href={valor === "todos" ? "/admin" : `/admin?filtro=${valor}`}
                className={`font-medium ${filtro === valor ? "text-slate-900 underline" : "text-blue-600 hover:underline"}`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {talleres.length === 0 ? (
            <Tarjeta className="text-center text-slate-600">No hay talleres en esta lista.</Tarjeta>
          ) : (
            <ul className="space-y-3">
              {talleres.map((t) => {
                const dias = diasDesde(t.ultimo_ingreso);
                return (
                  <li
                    key={t.id}
                    className={`rounded-2xl border p-4 shadow-sm ${t.suspendido_en ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {t.nombre}
                          {t.suspendido_en && <span className="ml-2 text-xs font-semibold text-red-700">SUSPENDIDO</span>}
                        </p>
                        <p className="text-sm text-slate-600">{t.duenos ?? "Sin dueño"}{t.telefono && ` · ${t.telefono}`}</p>
                        <p className="text-xs text-slate-500">Alta: {f(t.creado_en)}</p>
                        {t.suspendido_en && (
                          <p className="text-xs text-red-700">
                            Suspendido el {f(t.suspendido_en)}
                            {t.suspendido_motivo && `: ${t.suspendido_motivo}`}
                          </p>
                        )}
                      </div>
                      <AccionesTaller tallerId={t.id} nombre={t.nombre} suspendido={!!t.suspendido_en} />
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-6">
                      {[
                        ["Usuarios", t.usuarios],
                        ["Clientes", t.clientes],
                        ["Órdenes", t.ordenes],
                        ["Órdenes 30 días", t.ordenes_30d],
                        ["Facturado 30 días", formatoPesos(t.facturado_30d)],
                        ["Último ingreso", dias == null ? "Nunca" : dias === 0 ? "Hoy" : `Hace ${dias} días`],
                      ].map(([label, valor]) => (
                        <div key={label} className="rounded-lg bg-white/70 p-2">
                          <dt className="text-xs text-slate-500">{label}</dt>
                          <dd className="font-semibold text-slate-900">{valor}</dd>
                        </div>
                      ))}
                    </dl>
                    <p className="mt-2 text-xs text-slate-500">Última orden: {f(t.ultima_orden)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
