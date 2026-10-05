import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import SinPermiso from "@/components/sin-permiso";
import FormVehiculo from "@/components/form-vehiculo";
import { Tarjeta, Volver } from "@/components/ui";
import { actualizarVehiculo } from "../../actions";

export const metadata: Metadata = { title: "Editar vehículo" };

export default async function EditarVehiculoPage({ params }: PageProps<"/vehiculos/[id]/editar">) {
  const { id } = await params;
  const { tallerId, rol } = await obtenerSesion();
  if (!puede(rol, "editarClientes")) return <SinPermiso que="la edición de vehículos" />;
  const supabase = await createClient();
  const { data: v } = await supabase
    .from("vehiculos")
    .select("patente, marca, modelo, anio, km_actual")
    .eq("id", id)
    .eq("taller_id", tallerId)
    .maybeSingle();

  if (!v) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <Volver href={`/vehiculos/${id}`}>{v.patente}</Volver>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Editar vehículo</h1>
      <Tarjeta>
        <FormVehiculo
          accion={actualizarVehiculo.bind(null, id)}
          inicial={v}
          cancelarHref={`/vehiculos/${id}`}
          textoBoton="Guardar cambios"
        />
      </Tarjeta>
    </div>
  );
}
