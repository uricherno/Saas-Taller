import { formatoFecha, formatoPesos, labelTipoTrabajo } from "@/lib/ordenes";

type DatosPresupuesto = {
  taller: { nombre: string; telefono?: string | null };
  titulo: string;
  fecha: string;
  tipoTrabajo?: string | null;
  vehiculo: { patente: string; marca: string | null; modelo: string | null } | null;
  clienteNombre?: string | null;
  descripcion: string | null;
  items: { descripcion: string; cantidad: number | string; precio_unitario: number | string }[];
  total: number | string | null;
};

function cantidad(c: number | string) {
  return Number(c).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

/**
 * Resumen de la orden para mandar por WhatsApp.
 * Usa *negrita* de WhatsApp para el encabezado y el total.
 */
export function mensajePresupuesto(d: DatosPresupuesto): string {
  const lineas: string[] = [];

  lineas.push(`*${d.taller.nombre}*`);
  lineas.push(`${d.titulo} del ${formatoFecha(d.fecha)}`);
  lineas.push("");

  if (d.clienteNombre) lineas.push(`Hola ${d.clienteNombre}, te pasamos el detalle:`);
  if (d.vehiculo) {
    const auto = [d.vehiculo.marca, d.vehiculo.modelo].filter(Boolean).join(" ");
    lineas.push(`Vehículo: ${auto ? `${auto} ` : ""}(${d.vehiculo.patente})`);
  }
  if (d.tipoTrabajo) lineas.push(`Tipo de trabajo: ${labelTipoTrabajo(d.tipoTrabajo)}`);
  if (d.descripcion) lineas.push(`Trabajo: ${d.descripcion}`);

  if (d.items.length) {
    lineas.push("");
    lineas.push("Detalle:");
    for (const i of d.items) {
      const sub = Math.round(Number(i.cantidad) * Number(i.precio_unitario) * 100) / 100;
      const cant = Number(i.cantidad) === 1 ? "" : `${cantidad(i.cantidad)} × `;
      lineas.push(`• ${cant}${i.descripcion}: ${formatoPesos(sub)}`);
    }
  }

  lineas.push("");
  lineas.push(`*Total: ${formatoPesos(d.total)}*`);

  if (d.taller.telefono) {
    lineas.push("");
    lineas.push(`Consultas: ${d.taller.telefono}`);
  }

  return lineas.join("\n");
}
