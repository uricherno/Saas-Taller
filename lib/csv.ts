// CSV pensado para abrir con doble clic en Excel en español (Argentina):
//  - BOM UTF-8 al principio → Excel muestra bien tildes y ñ.
//  - Separador ";" → es el separador de listas de Excel con configuración regional en español.
//  - Números con coma decimal → Excel los toma como números.
//  - Fin de línea CRLF.

export type Celda = string | number | null | undefined;

const BOM = "﻿";
const SEPARADOR = ";";

function celda(valor: Celda): string {
  if (valor === null || valor === undefined) return "";
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? String(valor).replace(".", ",") : "";
  }
  let texto = String(valor);
  // Evitar "inyección de fórmulas": un texto que empieza con = + - @ (o tab/CR)
  // Excel lo ejecutaría como fórmula. Se antepone un apóstrofo.
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  // Comillas si hay separador, comillas o saltos de línea.
  return /[";\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function generarCsv(encabezados: string[], filas: Celda[][]): string {
  const lineas = [encabezados, ...filas].map((fila) => fila.map(celda).join(SEPARADOR));
  return BOM + lineas.join("\r\n") + "\r\n";
}

/** "2026-10-05" → "05/10/2026" */
export function fechaCsv(iso: string | null | undefined): string {
  if (!iso) return "";
  // Las fechas con hora vienen en UTC: se pasan al día de Argentina (si no, de noche sale el día siguiente).
  const dia = iso.length > 10 ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" }) : iso;
  const [a, m, d] = dia.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}
