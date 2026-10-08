import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { hoyISO } from "@/lib/ordenes";
import SinPermiso from "@/components/sin-permiso";
import { Tarjeta, Volver } from "@/components/ui";
import FormTurno from "./form-turno";

export const metadata: Metadata = { title: "Nuevo turno" };

export default async function NuevoTurnoPage({ searchParams }: PageProps<"/turnos/nuevo">) {
  const sp = await searchParams;
  const { tallerId, rol } = await obtenerSesion();
  if (!puede(rol, "turnos")) return <SinPermiso que="dar turnos" />;

  const hoy = hoyISO();
  const fecha = typeof sp.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.fecha) && sp.fecha >= hoy ? sp.fecha : hoy;

  const supabase = await createClient();
  let vehiculo: { id: string; descripcion: string } | null = null;
  let autos: { id: string; descripcion: string }[] = [];
  if (typeof sp.vehiculo === "string" && sp.vehiculo) {
    const { data: v } = await supabase
      .from("vehiculos")
      .select("id, patente, marca, modelo, clientes(nombre)")
      .eq("id", sp.vehiculo)
      .eq("taller_id", tallerId)
      .maybeSingle();
    if (!v) notFound();
    const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
    vehiculo = {
      id: v.id,
      descripcion: [cliente?.nombre, [v.marca, v.modelo].filter(Boolean).join(" "), v.patente].filter(Boolean).join(" · "),
    };
  } else {
    // Para elegir un auto ya cargado desde el mismo formulario.
    const { data } = await supabase
      .from("vehiculos")
      .select("id, patente, marca, modelo, clientes(nombre)")
      .eq("taller_id", tallerId)
      .order("patente")
      .limit(1000);
    autos = (data ?? []).map((v) => {
      const cliente = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
      return {
        id: v.id,
        descripcion: [v.patente, cliente?.nombre, [v.marca, v.modelo].filter(Boolean).join(" ")].filter(Boolean).join(" · "),
      };
    });
  }

  return (
    <div className="mx-auto max-w-xl">
      <Volver href={vehiculo ? `/vehiculos/${vehiculo.id}` : `/turnos?semana=${fecha}`}>
        {vehiculo ? "Volver al vehículo" : "Turnos"}
      </Volver>
      <Tarjeta>
        <h1 className="mb-4 text-xl font-bold text-slate-900">Nuevo turno</h1>
        <FormTurno vehiculo={vehiculo} autos={autos} fecha={fecha} hoy={hoy} />
      </Tarjeta>
    </div>
  );
}
