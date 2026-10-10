import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { Tarjeta } from "@/components/ui";
import { puede } from "@/lib/permisos";
import SinPermiso from "@/components/sin-permiso";
import { origenActual } from "@/lib/origen";
import { leerHorario } from "@/lib/reservas";
import FormAjustes from "./form-ajustes";
import FormReservas from "./form-reservas";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const { tallerId, rol } = await obtenerSesion();
  if (!puede(rol, "ajustes")) return <SinPermiso que="los ajustes del taller" />;
  const supabase = await createClient();
  const { data: taller, error } = await supabase
    .from("talleres")
    .select("nombre, telefono, mensaje_recordatorio")
    .eq("id", tallerId)
    .maybeSingle();
  // Aparte: si la migración 20261015 no está corrida, el resto de la pantalla igual anda.
  const [{ data: reservas }, origen] = await Promise.all([
    supabase.from("talleres").select("reservas_activas, reservas_codigo, horario").eq("id", tallerId).maybeSingle(),
    origenActual(),
  ]);

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Ajustes del taller</h1>
      {error || !taller ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudieron cargar los datos del taller."}
        </p>
      ) : (
        <Tarjeta>
          <FormAjustes inicial={taller} />
        </Tarjeta>
      )}

      {reservas && (
        <Tarjeta>
          <FormReservas
            activas={reservas.reservas_activas}
            horario={leerHorario(reservas.horario)}
            link={`${origen}/reservar/${reservas.reservas_codigo}`}
          />
        </Tarjeta>
      )}

      <Tarjeta>
        <h2 className="font-semibold text-slate-900">Exportar datos</h2>
        <p className="mb-4 text-sm text-slate-500">
          Descargá los datos de tu taller en CSV. Se abren con doble clic en Excel (con tildes y ñ) o en Google Sheets.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          {[
            { tipo: "clientes", label: "Clientes" },
            { tipo: "vehiculos", label: "Vehículos" },
            { tipo: "ordenes", label: "Órdenes" },
          ].map((x) => (
            // <a> común (no <Link>): es una descarga, no una navegación.
            <a
              key={x.tipo}
              href={`/api/exportar/${x.tipo}`}
              download
              className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Descargar {x.label}
            </a>
          ))}
        </div>
      </Tarjeta>
    </div>
  );
}
