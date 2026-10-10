import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { hoyISO } from "@/lib/ordenes";
import {
  DURACIONES,
  fechaAR,
  horaAR,
  inicioTurno,
  lunesDe,
  mensajeRecordatorioTurno,
  nombreDia,
  sumarDias,
} from "@/lib/turnos";
import { BotonLink, Tarjeta } from "@/components/ui";
import FilaTurno, { type Turno } from "./fila-turno";

export const metadata: Metadata = { title: "Turnos" };

type FilaDb = {
  id: string;
  inicio: string;
  duracion_min: number;
  estado: string;
  motivo: string | null;
  nombre_contacto: string | null;
  telefono: string | null;
  patente: string | null;
  cliente_id: string | null;
  vehiculo_id: string | null;
  recordado_en: string | null;
  origen?: string;
  clientes: { nombre: string; telefono: string | null } | { nombre: string; telefono: string | null }[] | null;
};

function duracionTexto(min: number) {
  return DURACIONES.find((d) => Number(d.valor) === min)?.label ?? `${min} minutos`;
}

export default async function TurnosPage({ searchParams }: PageProps<"/turnos">) {
  const sp = await searchParams;
  const hoy = hoyISO();
  const pedida = typeof sp.semana === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.semana) ? sp.semana : hoy;
  const lunes = lunesDe(pedida);
  const domingo = sumarDias(lunes, 6);

  const { tallerId, taller, rol } = await obtenerSesion();
  const puedeGestionar = puede(rol, "turnos");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("turnos")
    // "*" para no fallar si todavía no se corrió la migración que agrega "origen".
    .select("*, clientes(nombre, telefono)")
    .eq("taller_id", tallerId)
    .gte("inicio", inicioTurno(lunes, "00:00"))
    .lt("inicio", inicioTurno(sumarDias(lunes, 7), "00:00"))
    .order("inicio");

  const nombreTaller = taller?.nombre ?? "el taller";
  const porDia = new Map<string, Turno[]>();
  for (const t of (data ?? []) as FilaDb[]) {
    const cliente = Array.isArray(t.clientes) ? t.clientes[0] : t.clientes;
    const fecha = fechaAR(t.inicio);
    const hora = horaAR(t.inicio);
    const nombre = cliente?.nombre ?? t.nombre_contacto ?? "Sin nombre";
    const telefono = cliente?.telefono ?? t.telefono;
    const lista = porDia.get(fecha) ?? [];
    lista.push({
      id: t.id,
      hora,
      duracion: duracionTexto(t.duracion_min),
      estado: t.estado,
      motivo: t.motivo,
      nombre,
      telefono,
      patente: t.patente,
      clienteId: t.cliente_id,
      vehiculoId: t.vehiculo_id,
      recordadoEn: t.recordado_en,
      online: t.origen === "online",
      mensaje: mensajeRecordatorioTurno({
        nombre: cliente?.nombre ?? t.nombre_contacto,
        taller: nombreTaller,
        fecha,
        hora,
        patente: t.patente,
        hoy,
      }),
    });
    porDia.set(fecha, lista);
  }

  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const total = data?.length ?? 0;
  const formatoCorto = (f: string) => f.split("-").reverse().slice(0, 2).join("/");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Turnos</h1>
          <p className="text-sm text-slate-500">
            Semana del {formatoCorto(lunes)} al {formatoCorto(domingo)} · {total} {total === 1 ? "turno" : "turnos"}
          </p>
        </div>
        {puedeGestionar && <BotonLink href={`/turnos/nuevo?fecha=${pedida < hoy ? hoy : pedida}`}>+ Nuevo turno</BotonLink>}
      </div>

      <nav aria-label="Cambiar de semana" className="flex flex-wrap gap-2">
        <Link
          href={`/turnos?semana=${sumarDias(lunes, -7)}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          ← Anterior
        </Link>
        <Link
          href="/turnos"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Esta semana
        </Link>
        <Link
          href={`/turnos?semana=${sumarDias(lunes, 7)}`}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Siguiente →
        </Link>
      </nav>

      {error ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudieron cargar los turnos. Recargá la página."}
        </p>
      ) : (
        <div className="space-y-3">
          {dias.map((dia) => {
            const turnos = porDia.get(dia) ?? [];
            const esHoy = dia === hoy;
            // Los días sin turnos y ya pasados no se muestran, para que la lista sea corta.
            if (!turnos.length && dia < hoy) return null;
            return (
              <section key={dia} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${esHoy ? "border-blue-300" : "border-slate-200"}`}>
                <header
                  className={`flex items-center justify-between gap-2 px-4 py-2 ${esHoy ? "bg-blue-50" : "bg-slate-50"}`}
                >
                  <h2 className="font-semibold text-slate-900 capitalize">
                    {nombreDia(dia)}
                    {esHoy && <span className="ml-2 text-sm font-medium text-blue-700">Hoy</span>}
                  </h2>
                  {puedeGestionar && dia >= hoy && (
                    <Link href={`/turnos/nuevo?fecha=${dia}`} className="text-sm font-medium text-blue-600 hover:underline">
                      + Agregar
                    </Link>
                  )}
                </header>
                {turnos.length ? (
                  <ul className="divide-y divide-slate-100">
                    {turnos.map((t) => (
                      <FilaTurno key={t.id} turno={t} puedeGestionar={puedeGestionar} puedeBorrar={puede(rol, "borrar")} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-400">Sin turnos.</p>
                )}
              </section>
            );
          })}
          {total === 0 && dias[6] < hoy && (
            <Tarjeta className="text-center text-slate-600">No hubo turnos esta semana.</Tarjeta>
          )}
        </div>
      )}
    </div>
  );
}
