import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { linkWhatsapp } from "@/lib/whatsapp";
import BotonEliminar from "@/components/boton-eliminar";
import { BotonLink, Tarjeta, Volver } from "@/components/ui";
import { eliminarCliente } from "../actions";

export const metadata: Metadata = { title: "Ficha de cliente" };

export default async function ClientePage({ params }: PageProps<"/clientes/[id]">) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, nombre, telefono, notas, vehiculos(id, patente, marca, modelo, anio)")
    .eq("id", id)
    .order("patente", { referencedTable: "vehiculos" })
    .maybeSingle();

  if (!cliente) notFound();

  const whatsapp = linkWhatsapp(cliente.telefono);
  const vehiculos = cliente.vehiculos ?? [];

  return (
    <div className="space-y-5">
      <Volver href="/clientes">Clientes</Volver>

      <Tarjeta>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words text-slate-900">{cliente.nombre}</h1>
            <p className="mt-1 text-slate-600">{cliente.telefono || "Sin teléfono"}</p>
          </div>
          <div className="flex gap-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700"
              >
                WhatsApp
              </a>
            )}
            <BotonLink href={`/clientes/${id}/editar`} variante="secundario">
              Editar
            </BotonLink>
          </div>
        </div>
        {cliente.notas && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-700">Notas</p>
            <p className="mt-1 text-sm whitespace-pre-wrap text-slate-600">{cliente.notas}</p>
          </div>
        )}
      </Tarjeta>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Vehículos</h2>
          <BotonLink href={`/clientes/${id}/vehiculos/nuevo`}>+ Agregar vehículo</BotonLink>
        </div>

        {vehiculos.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">Este cliente todavía no tiene vehículos.</Tarjeta>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {vehiculos.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/vehiculos/${v.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50"
                >
                  <span className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-sm font-semibold tracking-wider text-slate-900">
                    {v.patente}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-sm text-slate-600">
                    {[v.marca, v.modelo, v.anio].filter(Boolean).join(" · ") || "Sin datos"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-slate-200 pt-5">
        <BotonEliminar
          accion={eliminarCliente.bind(null, id)}
          texto="Eliminar cliente"
          pregunta={`¿Seguro que querés eliminar a ${cliente.nombre}?`}
        />
      </section>
    </div>
  );
}
