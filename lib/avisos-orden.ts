import { formatoPesos } from "@/lib/ordenes";

export const AVISOS_ORDEN = [
  { valor: "recibido", label: "Recibimos tu auto" },
  { valor: "diagnostico", label: "Encontramos esto" },
  { valor: "listo", label: "Tu auto está listo" },
] as const;

export type AvisoOrden = (typeof AVISOS_ORDEN)[number]["valor"];

export type DatosAviso = {
  taller: string;
  telefonoTaller?: string | null;
  clienteNombre?: string | null;
  vehiculo: { patente: string; marca: string | null; modelo: string | null } | null;
  descripcion: string | null;
  total: number | string | null;
};

function auto(v: DatosAviso["vehiculo"]) {
  if (!v) return "tu vehículo";
  const nombre = [v.marca, v.modelo].filter(Boolean).join(" ");
  return nombre ? `tu ${nombre} (${v.patente})` : `tu vehículo (${v.patente})`;
}

/** Mensaje sugerido para avisarle al cliente en qué está su auto. El taller lo puede editar antes de enviar. */
export function mensajeAviso(tipo: AvisoOrden, d: DatosAviso): string {
  const saludo = `Hola${d.clienteNombre ? ` ${d.clienteNombre}` : ""}, te escribimos de ${d.taller}.`;
  const consultas = d.telefonoTaller ? `\n\nConsultas: ${d.telefonoTaller}` : "";

  switch (tipo) {
    case "recibido":
      return (
        `${saludo} Ya recibimos ${auto(d.vehiculo)}.` +
        (d.descripcion ? `\nVamos a revisar: ${d.descripcion}` : "") +
        `\nTe avisamos por acá cuando tengamos novedades.` +
        consultas
      );
    case "diagnostico":
      return (
        `${saludo} Revisamos ${auto(d.vehiculo)}.` +
        (d.descripcion ? `\nEncontramos: ${d.descripcion}` : "") +
        (Number(d.total) > 0 ? `\nEl presupuesto es de *${formatoPesos(d.total)}*.` : "") +
        `\n¿Nos confirmás si avanzamos con el trabajo?` +
        consultas
      );
    case "listo":
      return (
        `${saludo} ¡${auto(d.vehiculo).replace(/^t/, "T")} ya está listo para retirar!` +
        (Number(d.total) > 0 ? `\nTotal: *${formatoPesos(d.total)}*.` : "") +
        `\nTe esperamos en el taller.` +
        consultas
      );
  }
}