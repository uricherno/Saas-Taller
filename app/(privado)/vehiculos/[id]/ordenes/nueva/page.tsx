import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/ordenes";
import FormOrden from "@/components/form-orden";
import { Tarjeta, Volver } from "@/components/ui";
import { crearOrden } from "@/app/(privado)/ordenes/actions";

export const metadata: Metadata = { title: "Nueva orden" };

export default async function NuevaOrdenPage({ params }: PageProps<"/vehiculos/[id]/ordenes/nueva">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vehiculos")
    .select("patente, marca, modelo, km_actual, clientes(nombre)")
    .eq("id", id)
    .maybeSingle();

  if (!v) notFound();
  const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;

  return (
    <div className="mx-auto max-w-xl">
      <Volver href={`/vehiculos/${id}`}>{v.patente}</Volver>
      <h1 className="text-2xl font-bold text-slate-900">Nueva orden</h1>
      <p className="mb-4 text-sm text-slate-500">
        {v.patente} · {[v.marca, v.modelo].filter(Boolean).join(" ")}
        {cliente?.nombre && ` · ${cliente.nombre}`}
      </p>
      <Tarjeta>
        <FormOrden
          accion={crearOrden.bind(null, id)}
          // Sugerir el último km conocido del auto como km de ingreso.
          inicial={{ fecha: hoyISO(), km_ingreso: v.km_actual }}
          cancelarHref={`/vehiculos/${id}`}
          textoBoton="Crear y cargar items"
        />
      </Tarjeta>
    </div>
  );
}
