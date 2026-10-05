import { redirect } from "next/navigation";

// Ruta vieja: la orden nueva ahora vive en /ordenes/nueva.
export default async function NuevaOrdenVehiculo({ params }: PageProps<"/vehiculos/[id]/ordenes/nueva">) {
  const { id } = await params;
  redirect(`/ordenes/nueva?vehiculo=${id}`);
}
