import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FormCliente from "@/components/form-cliente";
import { Tarjeta, Volver } from "@/components/ui";
import { actualizarCliente } from "../../actions";

export const metadata: Metadata = { title: "Editar cliente" };

export default async function EditarClientePage({ params }: PageProps<"/clientes/[id]/editar">) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre, telefono, notas")
    .eq("id", id)
    .maybeSingle();

  if (!cliente) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Volver href={`/clientes/${id}`}>{cliente.nombre}</Volver>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Editar cliente</h1>
      <Tarjeta>
        <FormCliente
          accion={actualizarCliente.bind(null, id)}
          inicial={cliente}
          cancelarHref={`/clientes/${id}`}
          textoBoton="Guardar cambios"
        />
      </Tarjeta>
    </div>
  );
}
