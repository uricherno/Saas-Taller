"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { fechaAR, horaAR, nombreDia } from "@/lib/turnos";
import { Alerta, AreaTexto, BotonEnviar, Campo } from "@/components/ui";
import { reservarTurnoPublico } from "./actions";

type Dia = { fecha: string; horas: { hora: string; inicio: string }[] };

export default function FormReserva({
  codigo,
  dias,
  taller,
  telefonoTaller,
}: {
  codigo: string;
  dias: Dia[];
  taller: string;
  telefonoTaller: string | null;
}) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(reservarTurnoPublico.bind(null, codigo), {});
  const v = estado.valores ?? {};
  const [fecha, setFecha] = useState(dias[0]?.fecha ?? "");
  const [inicio, setInicio] = useState(v.inicio ?? "");
  const dia = dias.find((d) => d.fecha === fecha);

  if (estado.exito) {
    return (
      <div className="space-y-2 rounded-2xl border border-green-200 bg-green-50 p-5 text-green-900">
        <p className="text-lg font-semibold">¡Listo! Pediste turno para el {nombreDia(fechaAR(estado.exito))} a las {horaAR(estado.exito)}.</p>
        <p className="text-sm">
          {taller} te va a escribir por WhatsApp para confirmarlo.
          {telefonoTaller && ` Si necesitás cambiarlo, llamalos al ${telefonoTaller}.`}
        </p>
      </div>
    );
  }

  if (!dias.length) {
    return (
      <p className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-600">
        No hay horarios libres en los próximos días.{telefonoTaller && ` Comunicate con el taller al ${telefonoTaller}.`}
      </p>
    );
  }

  return (
    <form action={enviar} className="space-y-5">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">1. Elegí el día</h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {dias.map((d) => (
            <button
              key={d.fecha}
              type="button"
              onClick={() => {
                setFecha(d.fecha);
                setInicio("");
              }}
              className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-medium capitalize ${
                d.fecha === fecha ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-700"
              }`}
            >
              {nombreDia(d.fecha)}
            </button>
          ))}
        </div>

        <h2 className="pt-2 font-semibold text-slate-900">2. Elegí el horario</h2>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {dia?.horas.map((h) => (
            <button
              key={h.inicio}
              type="button"
              onClick={() => setInicio(h.inicio)}
              className={`rounded-lg border px-2 py-2.5 font-mono text-sm font-semibold ${
                inicio === h.inicio ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              {h.hora}
            </button>
          ))}
        </div>
        <input type="hidden" name="inicio" value={inicio} />
      </section>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-900">3. Tus datos</h2>
        <Campo label="Nombre" name="nombre" required maxLength={200} defaultValue={v.nombre} autoComplete="name" />
        <Campo
          label="Teléfono (WhatsApp)"
          name="telefono"
          type="tel"
          inputMode="tel"
          required
          defaultValue={v.telefono}
          placeholder="Ej: 11 2345-6789"
          autoComplete="tel"
        />
        <Campo label="Patente" opcional name="patente" maxLength={15} defaultValue={v.patente} />
        <AreaTexto
          label="¿Qué necesitás?"
          opcional
          name="motivo"
          maxLength={500}
          defaultValue={v.motivo}
          placeholder="Ej: service, ruido al frenar, revisión antes de viajar…"
        />
      </section>

      <BotonEnviar cargando={cargando}>{inicio ? "Pedir turno" : "Elegí un horario"}</BotonEnviar>
    </form>
  );
}
