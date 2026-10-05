import type { Metadata } from "next";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { obtenerEquipo } from "@/lib/equipo";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { DIAS_PRESUPUESTO_PENDIENTE, obtenerPresupuestosPendientes } from "@/lib/presupuestos-pendientes";
import ListaPresupuestos from "@/components/lista-presupuestos";
import { Tarjeta } from "@/components/ui";

export const metadata: Metadata = { title: "Presupuestos pendientes" };

export default async function PresupuestosPage() {
  const { tallerId, rol, taller } = await obtenerSesion();
  const [{ presupuestos, total, error }, equipo] = await Promise.all([
    obtenerPresupuestosPendientes(tallerId),
    obtenerEquipo(tallerId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Presupuestos pendientes</h1>
        <p className="text-sm text-slate-500">
          Órdenes presupuestadas hace más de {DIAS_PRESUPUESTO_PENDIENTE} días que el cliente todavía no confirmó.
          {total > 0 && ` Son ${total}.`}
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudieron cargar los presupuestos."}
        </p>
      ) : presupuestos.length === 0 ? (
        <Tarjeta className="text-center text-slate-600">No hay presupuestos esperando respuesta.</Tarjeta>
      ) : (
        <ListaPresupuestos
          presupuestos={presupuestos}
          taller={taller?.nombre ?? "el taller"}
          puedeContactar={puede(rol, "contactarClientes")}
          equipo={equipo.filter((u) => u.activo)}
        />
      )}
    </div>
  );
}
