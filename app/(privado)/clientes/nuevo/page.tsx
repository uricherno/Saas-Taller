import type { Metadata } from "next";
import FormCliente from "@/components/form-cliente";
import { Tarjeta, Volver } from "@/components/ui";
import { crearCliente } from "../actions";

export const metadata: Metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-xl">
      <Volver href="/clientes">Clientes</Volver>
      <h1 className="mb-4 text-2xl font-bold text-slate-900">Nuevo cliente</h1>
      <Tarjeta>
        <FormCliente accion={crearCliente} cancelarHref="/clientes" textoBoton="Guardar cliente" />
      </Tarjeta>
    </div>
  );
}
