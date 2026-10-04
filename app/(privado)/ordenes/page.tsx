import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ESTADOS, esEstado } from "@/lib/ordenes";
import ListaOrdenes from "@/components/lista-ordenes";
import { Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Órdenes" };

export default async function OrdenesPage({ searchParams }: PageProps<"/ordenes">) {
  const { estado } = await searchParams;
  const filtro = typeof estado === "string" && esEstado(estado) ? estado : null;

  const supabase = await createClient();
  let query = supabase
    .from("ordenes_trabajo")
    .select("id, fecha, estado, descripcion, total, vehiculos(patente, marca, modelo, clientes(nombre))")
    .order("fecha", { ascending: false })
    .order("creado_en", { ascending: false })
    .limit(200);
  if (filtro) query = query.eq("estado", filtro);

  const { data: ordenes, error } = await query;

  const filtros = [{ valor: null, label: "Todas" }, ...ESTADOS];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Órdenes de trabajo</h1>
        <p className="text-sm text-slate-500">Para crear una orden, entrá a la ficha del vehículo.</p>
      </div>

      <nav aria-label="Filtrar por estado" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {filtros.map((f) => {
          const activo = f.valor === filtro;
          return (
            <Link
              key={f.label}
              href={f.valor ? `/ordenes?estado=${f.valor}` : "/ordenes"}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${
                activo
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          No se pudieron cargar las órdenes. Recargá la página.
        </p>
      ) : !ordenes?.length ? (
        <Tarjeta className="text-center text-slate-600">
          {filtro ? "No hay órdenes con ese estado." : "Todavía no hay órdenes. Creá la primera desde la ficha de un vehículo."}
        </Tarjeta>
      ) : (
        <ListaOrdenes ordenes={ordenes} mostrarVehiculo />
      )}
    </div>
  );
}
