import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { hoyISO } from "@/lib/ordenes";
import { horariosLibres, leerHorario } from "@/lib/reservas";
import FormReserva from "./form-reserva";

// Página pública: el cliente saca turno sin cuenta. No se indexa.
export const metadata: Metadata = { title: "Sacá tu turno", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type Info = { taller: string; telefono: string | null; horario: unknown; ocupados: string[] };

export default async function ReservarPage({ params }: PageProps<"/reservar/[codigo]">) {
  const { codigo } = await params;
  const supabase = await createClient();
  const { data, error } = /^[0-9a-f]{12}$/.test(codigo)
    ? await supabase.rpc("reservas_info", { p_codigo: codigo })
    : { data: null, error: null };
  if (error) console.error("[reservas] Error al leer el taller:", error);
  const info = data as Info | null;

  if (!info) {
    return (
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-16 text-center">
        <h1 className="text-xl font-bold text-slate-900">Turnos online no disponibles</h1>
        <p className="mt-2 text-slate-600">Este taller no está tomando turnos por acá en este momento. Comunicate directamente con ellos.</p>
      </main>
    );
  }

  const dias = horariosLibres(leerHorario(info.horario), info.ocupados ?? [], hoyISO(), new Date());

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 space-y-5 px-4 py-6">
      <header>
        <p className="text-sm font-semibold text-slate-500">{info.taller}</p>
        <h1 className="text-2xl font-bold text-slate-900">Sacá tu turno</h1>
        <p className="text-sm text-slate-600">Elegí el día y el horario. El taller te va a confirmar por WhatsApp.</p>
      </header>
      <FormReserva codigo={codigo} dias={dias} taller={info.taller} telefonoTaller={info.telefono} />
    </main>
  );
}
