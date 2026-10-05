"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { TIPOS_INTERACCION } from "@/lib/crm";
import {
  agregarInteraccion,
  borrarVencimiento,
  crearSeguimiento,
  crearVencimiento,
  marcarSeguimiento,
} from "@/app/(privado)/crm/actions";
import { Alerta, Campo, Selector } from "@/components/ui";

const ESTILO_TEXTAREA =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

/** Formulario corto para dejar una nota (o llamada, etc.) en la línea de tiempo. */
export function FormNota({
  clienteId,
  vehiculoId,
  soloNotas,
}: {
  clienteId: string;
  vehiculoId?: string | null;
  /** El mecánico solo puede agregar notas. */
  soloNotas: boolean;
}) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(
    agregarInteraccion.bind(null, { clienteId, vehiculoId }),
    {},
  );
  const tipos = soloNotas ? TIPOS_INTERACCION.filter((t) => t.valor === "nota") : TIPOS_INTERACCION.filter((t) => t.valor !== "whatsapp");

  return (
    // React vacía el formulario después de cada envío; si hubo error, defaultValue recupera el texto.
    <form action={enviar} className="space-y-2">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <textarea
        name="texto"
        rows={2}
        required
        maxLength={4000}
        defaultValue={estado.exito ? "" : estado.valores?.texto}
        placeholder="Ej: Llamó para preguntar por el turno del jueves."
        aria-label="Nota"
        className={ESTILO_TEXTAREA}
      />
      <div className="flex items-center gap-2">
        {tipos.length > 1 ? (
          <select
            name="tipo"
            defaultValue={estado.valores?.tipo ?? "nota"}
            aria-label="Tipo"
            className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm text-slate-700"
          >
            {tipos.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.icono} {t.label}
              </option>
            ))}
          </select>
        ) : (
          <input type="hidden" name="tipo" value="nota" />
        )}
        <button
          type="submit"
          disabled={cargando}
          className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {cargando ? "Guardando…" : "Agregar"}
        </button>
      </div>
    </form>
  );
}

/** Botón "+ Seguimiento" que despliega un formulario corto. */
export function NuevoSeguimiento({
  clienteId,
  vehiculoId,
  ordenId,
  equipo,
  tituloSugerido = "",
  venceSugerido,
  textoBoton = "+ Seguimiento",
}: {
  clienteId: string;
  vehiculoId?: string | null;
  ordenId?: string | null;
  equipo: { id: string; nombre: string }[];
  tituloSugerido?: string;
  /** YYYY-MM-DD */
  venceSugerido: string;
  textoBoton?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(
    async (prev: EstadoForm, fd: FormData) => {
      const r = await crearSeguimiento({ clienteId, vehiculoId, ordenId }, prev, fd);
      if (r.exito) setAbierto(false);
      return r;
    },
    {},
  );

  if (!abierto) {
    return (
      <span className="inline-flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {textoBoton}
        </button>
        {estado.exito && <span className="text-xs text-green-700">{estado.exito}</span>}
      </span>
    );
  }

  return (
    <form action={enviar} className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Campo
        label="Qué hay que hacer"
        name="titulo"
        required
        maxLength={300}
        defaultValue={estado.valores?.titulo ?? tituloSugerido}
        placeholder="Ej: Llamar para confirmar el presupuesto"
        autoFocus
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Para cuándo" name="vence_en" type="date" required defaultValue={estado.valores?.vence_en ?? venceSugerido} />
        <Selector
          label="Asignado a"
          name="asignado_a"
          opciones={[{ valor: "", label: "Sin asignar" }, ...equipo.map((u) => ({ valor: u.id, label: u.nombre }))]}
          defaultValue={estado.valores?.asignado_a ?? ""}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {cargando ? "Guardando…" : "Crear seguimiento"}
        </button>
      </div>
    </form>
  );
}

/** "Marcar hecha" / "Reabrir" de un seguimiento. */
export function BotonMarcarHecha({ id, hecha }: { id: string; hecha: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [guardando, startTransition] = useTransition();
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={guardando}
        onClick={() =>
          startTransition(async () => {
            const r = await marcarSeguimiento(id, !hecha);
            setError(r.error ?? null);
          })
        }
        className={
          hecha
            ? "rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60"
            : "rounded-lg border border-green-300 bg-white px-3 py-1.5 text-sm font-semibold text-green-700 hover:bg-green-50 disabled:opacity-60"
        }
      >
        {guardando ? "…" : hecha ? "Reabrir" : "✓ Marcar hecha"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}

const TIPOS_VENCIMIENTO = [
  { valor: "vtv", label: "VTV" },
  { valor: "seguro", label: "Seguro" },
  { valor: "otro", label: "Otro" },
];

/** Cargar un vencimiento (VTV, seguro u otro) del vehículo. */
export function FormVencimiento({ vehiculoId }: { vehiculoId: string }) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(
    async (prev: EstadoForm, fd: FormData) => {
      const r = await crearVencimiento(vehiculoId, prev, fd);
      if (r.exito) setAbierto(false);
      return r;
    },
    {},
  );

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
      >
        + Vencimiento
      </button>
    );
  }

  return (
    <form action={enviar} className="w-full space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Selector label="Qué vence" name="tipo" opciones={TIPOS_VENCIMIENTO} defaultValue={estado.valores?.tipo ?? "vtv"} />
        <Campo label="Fecha de vencimiento" name="fecha" type="date" required defaultValue={estado.valores?.fecha} />
      </div>
      <Campo
        label="Nota"
        opcional
        name="nota"
        maxLength={500}
        defaultValue={estado.valores?.nota}
        placeholder="Ej: Seguro con La Caja, póliza 1234"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {cargando ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

export function BotonBorrarVencimiento({ id }: { id: string }) {
  const [confirmando, setConfirmando] = useState(false);
  const [borrando, startTransition] = useTransition();
  if (!confirmando) {
    return (
      <button type="button" onClick={() => setConfirmando(true)} className="text-sm text-red-600 hover:underline">
        Borrar
      </button>
    );
  }
  return (
    <span className="flex gap-2 text-sm">
      <button
        type="button"
        disabled={borrando}
        onClick={() => startTransition(async () => void (await borrarVencimiento(id)))}
        className="font-semibold text-red-600 hover:underline disabled:opacity-60"
      >
        {borrando ? "Borrando…" : "Sí, borrar"}
      </button>
      <button type="button" onClick={() => setConfirmando(false)} className="text-slate-600 hover:underline">
        Cancelar
      </button>
    </span>
  );
}
