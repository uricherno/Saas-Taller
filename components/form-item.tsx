"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { TIPOS_ITEM } from "@/lib/ordenes";
import { Alerta, BotonEnviar, Campo, Selector } from "@/components/ui";

export default function FormItem({
  accion,
}: {
  accion: (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>;
}) {
  const [estado, enviar, cargando] = useActionState(accion, {});
  const v = estado.valores ?? { tipo: "repuesto", cantidad: "1" };

  return (
    <form action={enviar} className="space-y-3" key={JSON.stringify(estado)}>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[10rem_1fr]">
        <Selector label="Tipo" name="tipo" opciones={TIPOS_ITEM} defaultValue={v.tipo} />
        <Campo
          label="Descripción"
          name="descripcion"
          required
          defaultValue={v.descripcion}
          placeholder="Ej: Filtro de aceite"
          autoFocus={Boolean(estado.exito)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
        <Campo label="Cantidad" name="cantidad" inputMode="decimal" required defaultValue={v.cantidad} />
        <Campo
          label="Precio unitario ($)"
          name="precio_unitario"
          inputMode="decimal"
          required
          defaultValue={v.precio_unitario}
          placeholder="Ej: 15000"
        />
        <div className="col-span-2 sm:col-span-1 sm:w-40">
          <BotonEnviar cargando={cargando}>Agregar</BotonEnviar>
        </div>
      </div>
    </form>
  );
}
