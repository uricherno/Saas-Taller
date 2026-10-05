"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { ESTADOS, TIPOS_TRABAJO } from "@/lib/ordenes";
import { Alerta, AreaTexto, BotonEnviar, BotonLink, Campo, Selector } from "@/components/ui";

type Orden = {
  fecha: string;
  tipo_trabajo: string;
  km_ingreso: number | null;
  descripcion: string | null;
  estado: string;
  proximo_service_fecha: string | null;
  proximo_service_km: number | null;
};

export default function FormOrden({
  accion,
  inicial,
  cancelarHref,
  textoBoton,
}: {
  accion: (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial: Partial<Orden> & { fecha: string };
  cancelarHref: string;
  textoBoton: string;
}) {
  const [estado, enviar, cargando] = useActionState(accion, {});
  const v = estado.valores ?? {
    fecha: inicial.fecha,
    tipo_trabajo: inicial.tipo_trabajo ?? "service",
    km_ingreso: inicial.km_ingreso?.toString() ?? "",
    descripcion: inicial.descripcion ?? "",
    estado: inicial.estado ?? "presupuestado",
    proximo_service_fecha: inicial.proximo_service_fecha ?? "",
    proximo_service_km: inicial.proximo_service_km?.toString() ?? "",
  };

  return (
    <form action={enviar} className="space-y-4" key={JSON.stringify(v)}>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Fecha" name="fecha" type="date" required defaultValue={v.fecha} />
        <Selector label="Estado" name="estado" opciones={ESTADOS} defaultValue={v.estado} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Selector label="Tipo de trabajo" name="tipo_trabajo" opciones={TIPOS_TRABAJO} defaultValue={v.tipo_trabajo} />
        <Campo
          label="Kilometraje de ingreso"
          opcional
          name="km_ingreso"
          inputMode="numeric"
          defaultValue={v.km_ingreso}
          placeholder="Ej: 85000"
        />
      </div>

      <AreaTexto
        label="Descripción del trabajo"
        opcional
        name="descripcion"
        rows={4}
        defaultValue={v.descripcion}
        placeholder="Ej: Cambio de aceite y filtros. Revisar ruido en tren delantero."
      />

      <fieldset className="rounded-xl border border-slate-200 p-4">
        <legend className="px-1 text-sm font-semibold text-slate-700">Próximo service</legend>
        <p className="mb-3 text-xs text-slate-500">Podés completar la fecha, el kilometraje o los dos.</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Fecha" opcional name="proximo_service_fecha" type="date" defaultValue={v.proximo_service_fecha} />
          <Campo
            label="Kilometraje"
            opcional
            name="proximo_service_km"
            inputMode="numeric"
            defaultValue={v.proximo_service_km}
            placeholder="Ej: 95000"
          />
        </div>
      </fieldset>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <BotonLink href={cancelarHref} variante="secundario">
          Cancelar
        </BotonLink>
        <div className="sm:w-48">
          <BotonEnviar cargando={cargando}>{textoBoton}</BotonEnviar>
        </div>
      </div>
    </form>
  );
}
