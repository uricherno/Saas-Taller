"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { DURACIONES } from "@/lib/turnos";
import { Alerta, AreaTexto, BotonEnviar, Campo, Selector } from "@/components/ui";
import { crearTurno } from "../actions";

export default function FormTurno({
  vehiculo,
  fecha,
  hoy,
}: {
  /** Si viene, el turno es para un auto ya cargado y no se piden datos de contacto. */
  vehiculo: { id: string; descripcion: string } | null;
  fecha: string;
  hoy: string;
}) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(crearTurno, {});
  const v = estado.valores ?? {};

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
          <p className="text-sm text-slate-500">
            Para un cliente que ya tenés cargado, entrá a la ficha del auto y tocá “Dar turno”.
          </p>
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
