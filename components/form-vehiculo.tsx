"use client";

import { useActionState } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { Alerta, BotonEnviar, BotonLink, Campo } from "@/components/ui";

type Vehiculo = {
  patente: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  km_actual: number | null;
};

export default function FormVehiculo({
  accion,
  inicial,
  cancelarHref,
  textoBoton,
}: {
  accion: (prev: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  inicial?: Vehiculo;
  cancelarHref: string;
  textoBoton: string;
}) {
  const [estado, enviar, cargando] = useActionState(accion, {});
  const v = estado.valores ?? {
    patente: inicial?.patente ?? "",
    marca: inicial?.marca ?? "",
    modelo: inicial?.modelo ?? "",
    anio: inicial?.anio?.toString() ?? "",
    km_actual: inicial?.km_actual?.toString() ?? "",
  };

  return (
    <form action={enviar} className="space-y-4" key={JSON.stringify(v)}>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      <Campo
        label="Patente"
        name="patente"
        required
        autoCapitalize="characters"
        autoComplete="off"
        defaultValue={v.patente}
        placeholder="Ej: AB123CD"
        style={{ textTransform: "uppercase" }}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Marca" opcional name="marca" defaultValue={v.marca} placeholder="Ej: Volkswagen" />
        <Campo label="Modelo" opcional name="modelo" defaultValue={v.modelo} placeholder="Ej: Gol Trend" />
        <Campo
          label="Año"
          opcional
          name="anio"
          inputMode="numeric"
          maxLength={4}
          defaultValue={v.anio}
          placeholder="Ej: 2018"
        />
        <Campo
          label="Kilometraje"
          opcional
          name="km_actual"
          inputMode="numeric"
          defaultValue={v.km_actual}
          placeholder="Ej: 85000"
        />
      </div>
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
