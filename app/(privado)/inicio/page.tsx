import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { ESTADOS_ABIERTOS } from "@/lib/ordenes";
import ListaOrdenes from "@/components/lista-ordenes";
import { BotonLink, Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Inicio" };

export default async function InicioPage() {
  const { usuario, taller } = await obtenerSesion();
  const supabase = await createClient();

  const { data: abiertas } = await supabase
    .from("ordenes_trabajo")
    .select("id, fecha, estado, descripcion, total, vehiculos(patente, marca, modelo, clientes(nombre))")
    .in("estado", ESTADOS_ABIERTOS)
    .order("fecha", { ascending: true }) // las más viejas primero: son las más urgentes
    .limit(50);

  const ordenes = abiertas ?? [];

  return (
    <div className="space-y-6">
      <Tarjeta className="p-6">
        <h1 className="text-2xl font-bold text-slate-900">¡Hola, {usuario.nombre}!</h1>
        <p className="mt-1 text-slate-600">
          Panel de <span className="font-semibold">{taller?.nombre}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <BotonLink href="/clientes">Clientes</BotonLink>
          <BotonLink href="/ordenes" variante="secundario">
            Todas las órdenes
          </BotonLink>
        </div>
      </Tarjeta>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Órdenes abiertas <span className="text-slate-400">({ordenes.length})</span>
          </h2>
          <Link href="/ordenes?estado=en_proceso" className="text-sm font-medium text-blue-600 hover:underline">
            Ver en proceso
          </Link>
        </div>
        {ordenes.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">
            No hay órdenes presupuestadas ni en proceso.
          </Tarjeta>
        ) : (
          <ListaOrdenes ordenes={ordenes} mostrarVehiculo />
        )}
      </section>
    </div>
  );
}
