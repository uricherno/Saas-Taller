"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { DURACIONES } from "@/lib/turnos";
import { Alerta, AreaTexto, BotonEnviar, Campo, Selector } from "@/components/ui";
import { crearTurno } from "../actions";

type Auto = { id: string; descripcion: string };

export default function FormTurno({
  vehiculo,
  autos,
  fecha,
  hoy,
}: {
  /** Si viene, el turno es para un auto ya cargado y no se piden datos de contacto. */
  vehiculo: Auto | null;
  /** Autos del taller, para elegir uno desde el formulario. */
  autos: Auto[];
  fecha: string;
  hoy: string;
}) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(crearTurno, {});
  const v = estado.valores ?? {};
  const [paraCargado, setParaCargado] = useState(
    v.vehiculo_id ? true : v.nombre_contacto ? false : autos.length > 0,
  );

  return (
    <form action={enviar} className="space-y-4">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}

      {vehiculo ? (
        <>
          <input type="hidden" name="vehiculo_id" value={vehiculo.id} />
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{vehiculo.descripcion}</p>
        </>
      ) : (
        <>
          <div role="radiogroup" aria-label="¿Para quién es el turno?" className="grid grid-cols-2 gap-2">
            {[
              { valor: true, label: "Auto ya cargado" },
              { valor: false, label: "Cliente nuevo" },
            ].map((o) => (
              <label
                key={o.label}
                className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium ${
                  paraCargado === o.valor ? "border-blue-600 bg-blue-50 text-blue-800" : "border-slate-300 text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="para"
                  checked={paraCargado === o.valor}
                  onChange={() => setParaCargado(o.valor)}
                  className="accent-blue-600"
                />
                {o.label}
              </label>
            ))}
          </div>
        </>
      )}

      {!vehiculo && paraCargado && (
        autos.length ? (
          <Selector
            label="Auto"
            name="vehiculo_id"
            required
            defaultValue={v.vehiculo_id ?? ""}
            opciones={[{ valor: "", label: "Elegí la patente…" }, ...autos.map((a) => ({ valor: a.id, label: a.descripcion }))]}
          />
        ) : (
          <p className="text-sm text-slate-500">Todavía no hay autos cargados. Elegí “Cliente nuevo”.</p>
        )
      )}

      {!vehiculo && !paraCargado && (
        <>
          <Campo label="Nombre" name="nombre_contacto" required maxLength={200} defaultValue={v.nombre_contacto} />
          <Campo
            label="Teléfono (WhatsApp)"
            opcional
            name="telefono"
            type="tel"
            inputMode="tel"
            defaultValue={v.telefono}
            placeholder="Ej: 11 2345-6789"
          />
          <Campo label="Patente" opcional name="patente" maxLength={15} defaultValue={v.patente} />
        </>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Día" name="fecha" type="date" required min={hoy} defaultValue={v.fecha ?? fecha} />
        <Campo label="Hora" name="hora" type="time" required step={900} defaultValue={v.hora ?? "09:00"} />
      </div>
      <Selector label="Duración" name="duracion_min" opciones={DURACIONES} defaultValue={v.duracion_min ?? "60"} />
      <AreaTexto
        label="Motivo"
        opcional
        name="motivo"
        maxLength={500}
        defaultValue={v.motivo}
        placeholder="Ej: Service de 10.000 km, ruido en el tren delantero…"
      />

      <BotonEnviar cargando={cargando}>Guardar turno</BotonEnviar>
    </form>
  );
}
