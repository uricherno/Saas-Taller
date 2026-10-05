import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import FormOrden from "@/components/form-orden";
import { Tarjeta, Volver } from "@/components/ui";
import { actualizarOrden } from "../../actions";

export const metadata: Metadata = { title: "Editar orden" };

export default async function EditarOrdenPage({ params }: PageProps<"/ordenes/[id]/editar">) {
  const { id } = await params;
  const { tallerId } = await obtenerSesion();
  const supabase = await createClient();
  const { data: orden, error } = await supabase
    .from("ordenes_trabajo")
    .select("fecha, tipo_trabajo, km_ingreso, descripcion, estado, proximo_service_fecha, proximo_service_km, vehiculos(patente)")
    .eq("id", id)
    .eq("taller_id", tallerId)
    .maybeSingle();

  if (faltaMigracion(error)) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {MENSAJE_FALTA_MIGRACION}
      </p>
    );
  }
  if (!orden) notFound();
  const vehiculo = Array.isArray(orden.vehiculos) ? orden.vehiculos[0] : orden.vehiculos;

  return (
    <div className="mx-auto max-w-xl">
      <Volver href={`/ordenes/${id}`}>Volver a la orden</Volver>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">
        Editar orden {vehiculo?.patente && <span className="font-mono">{vehiculo.patente}</span>}
      </h1>
      <Tarjeta>
        <FormOrden
          accion={actualizarOrden.bind(null, id)}
          inicial={orden}
          cancelarHref={`/ordenes/${id}`}
          textoBoton="Guardar cambios"
        />
      </Tarjeta>
    </div>
  );
}
