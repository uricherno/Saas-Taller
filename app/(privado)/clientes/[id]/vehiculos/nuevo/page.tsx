import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import SinPermiso from "@/components/sin-permiso";
import FormVehiculo from "@/components/form-vehiculo";
import { Tarjeta, Volver } from "@/components/ui";
import { crearVehiculo } from "@/app/(privado)/vehiculos/actions";

export const metadata: Metadata = { title: "Agregar vehículo" };

export default async function NuevoVehiculoPage({ params }: PageProps<"/clientes/[id]/vehiculos/nuevo">) {
  const { id } = await params;
  const { tallerId, rol } = await obtenerSesion();
  if (!puede(rol, "editarClientes")) return <SinPermiso que="la carga de vehículos" />;
  const supabase = await createClient();
  const { data: cliente } = await supabase
    .from("clientes")
    .select("nombre")
    .eq("id", id)
    .eq("taller_id", tallerId)
    .maybeSingle();

  if (!cliente) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Volver href={`/clientes/${id}`}>{cliente.nombre}</Volver>
      <h1 className="text-2xl font-bold text-slate-900">Agregar vehículo</h1>
      <p className="mb-4 text-sm text-slate-500">Cliente: {cliente.nombre}</p>
      <Tarjeta>
        <FormVehiculo
          accion={crearVehiculo.bind(null, id)}
          cancelarHref={`/clientes/${id}`}
          textoBoton="Guardar vehículo"
        />
      </Tarjeta>
    </div>
  );
}
