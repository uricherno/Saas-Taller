"use client";

import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import {
  MAX_LARGO_PLANTILLA,
  PLANTILLA_POR_DEFECTO,
  VARIABLES,
  aplicarPlantilla,
} from "@/lib/plantilla-recordatorio";
import { Alerta, BotonEnviar, Campo } from "@/components/ui";
import { guardarAjustes } from "./actions";

const EJEMPLO = { nombre: "Juan", marca: "Volkswagen", modelo: "Gol Trend", patente: "AB123CD" };

export default function FormAjustes({
  inicial,
}: {
  inicial: { nombre: string; telefono: string | null; mensaje_recordatorio: string | null };
}) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(guardarAjustes, {});
  const v = estado.valores ?? {
    nombre: inicial.nombre,
    telefono: inicial.telefono ?? "",
    mensaje_recordatorio: inicial.mensaje_recordatorio ?? PLANTILLA_POR_DEFECTO,
  };

  // El mensaje es controlado para mostrar la vista previa mientras se escribe.
  const [mensaje, setMensaje] = useState(v.mensaje_recordatorio);
  const [nombreTaller, setNombreTaller] = useState(v.nombre);

  return (
    <form action={enviar} className="space-y-5">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      {estado.exito && <Alerta tipo="exito">{estado.exito}</Alerta>}

      <section className="space-y-4">
        <h2 className="font-semibold text-slate-900">Datos del taller</h2>
        <Campo
          label="Nombre del taller"
          name="nombre"
          required
          maxLength={120}
          value={nombreTaller}
          onChange={(e) => setNombreTaller(e.target.value)}
        />
        <Campo
          label="Teléfono"
          opcional
          name="telefono"
          type="tel"
          inputMode="tel"
          defaultValue={v.telefono}
          placeholder="Ej: 11 2345-6789"
        />
        <p className="-mt-2 text-xs text-slate-500">Aparece al final de los presupuestos que mandás por WhatsApp.</p>
      </section>

      <section className="space-y-3 border-t border-slate-200 pt-5">
        <h2 className="font-semibold text-slate-900">Mensaje de recordatorio de service</h2>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Texto del mensaje de WhatsApp</span>
          <textarea
            name="mensaje_recordatorio"
            rows={5}
            maxLength={MAX_LARGO_PLANTILLA}
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </label>

        <div className="flex flex-wrap gap-1.5">
          {VARIABLES.map((x) => (
            <button
              key={x.clave}
              type="button"
              title={x.descripcion}
              onClick={() => setMensaje((m) => `${m}${m.endsWith(" ") || !m ? "" : " "}${x.clave}`)}
              className="rounded-md border border-slate-300 bg-slate-50 px-2 py-1 font-mono text-xs text-slate-700 hover:bg-slate-100"
            >
              {x.clave}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMensaje(PLANTILLA_POR_DEFECTO)}
            className="rounded-md px-2 py-1 text-xs font-medium text-blue-600 hover:underline"
          >
            Restaurar el mensaje por defecto
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Tocá una variable para agregarla al final. Cada una se reemplaza por el dato del cliente o del auto.
        </p>

        <div className="rounded-xl bg-green-50 p-3">
          <p className="mb-1 text-xs font-semibold tracking-wide text-green-800 uppercase">Vista previa</p>
          <p className="text-sm whitespace-pre-wrap text-slate-800">
            {aplicarPlantilla(mensaje, { ...EJEMPLO, taller: nombreTaller || "tu taller" })}
          </p>
        </div>
      </section>

      <div className="sm:w-48">
        <BotonEnviar cargando={cargando}>Guardar ajustes</BotonEnviar>
      </div>
    </form>
  );
}
