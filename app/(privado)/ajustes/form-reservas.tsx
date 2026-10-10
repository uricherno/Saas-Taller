"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { DIAS_SEMANA, DURACIONES_RESERVA, type Horario } from "@/lib/reservas";
import { Alerta, BotonEnviar, Campo, Selector } from "@/components/ui";
import { guardarReservas } from "./actions";

export default function FormReservas({ activas, horario, link }: { activas: boolean; horario: Horario; link: string }) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(guardarReservas, {});
  const [copiado, setCopiado] = useState(false);

  return (
    <form action={enviar} className="space-y-4">
      <div>
        <h2 className="font-semibold text-slate-900">Turnos online</h2>
        <p className="text-sm text-slate-500">
          Una página pública donde tus clientes eligen un horario libre y sacan turno solos. Los turnos aparecen en
          Turnos marcados como “Online”.
        </p>
      </div>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      {estado.exito && <Alerta tipo="exito">{estado.exito}</Alerta>}

      <label className="flex items-center gap-3 text-sm font-medium text-slate-800">
        <input type="checkbox" name="activas" defaultChecked={activas} className="h-5 w-5 accent-blue-600" />
        Aceptar turnos online
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-medium text-slate-700">Días de atención</legend>
        <div className="flex flex-wrap gap-2">
          {DIAS_SEMANA.map((d) => (
            <label key={d.valor} className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm">
              <input type="checkbox" name="dias" value={d.valor} defaultChecked={horario.dias.includes(d.valor)} className="accent-blue-600" />
              {d.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Campo label="Abre" name="desde" type="time" required step={900} defaultValue={horario.desde} />
        <Campo label="Cierra" name="hasta" type="time" required step={900} defaultValue={horario.hasta} />
      </div>
      <Selector label="Turnos" name="duracion" opciones={DURACIONES_RESERVA} defaultValue={String(horario.duracion)} />

      <div className="space-y-2 rounded-xl bg-slate-50 p-3">
        <p className="text-sm font-medium text-slate-700">Link para compartir (WhatsApp, Instagram, Google…)</p>
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          aria-label="Link de turnos online"
          className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(link).then(() => setCopiado(true));
            }}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            {copiado ? "¡Copiado!" : "Copiar link"}
          </button>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Ver cómo lo ve el cliente
          </a>
        </div>
        {!activas && <p className="text-xs text-amber-700">Mientras esté pausado, el link muestra que no hay reservas online.</p>}
      </div>

      <div className="sm:w-48">
        <BotonEnviar cargando={cargando}>Guardar</BotonEnviar>
      </div>
    </form>
  );
}
