import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";
import { formatoFecha, formatoKm, formatoPesos, labelTipoTrabajo } from "@/lib/ordenes";

export type DatosPdf = {
  titulo: "Presupuesto" | "Orden de trabajo";
  numero: string;
  fecha: string; // YYYY-MM-DD
  /** Hasta cuándo vale el presupuesto (YYYY-MM-DD), solo para presupuestos. */
  validoHasta: string | null;
  taller: { nombre: string; telefono: string | null };
  cliente: { nombre: string; telefono: string | null } | null;
  vehiculo: { patente: string; marca: string | null; modelo: string | null; anio: number | null } | null;
  kmIngreso: number | null;
  tipoTrabajo: string | null;
  descripcion: string | null;
  items: { codigo: string | null; descripcion: string; tipo: string; cantidad: number; precio: number }[];
  total: number;
  proximoService: { fecha: string | null; km: number | null } | null;
};

// A4 en puntos.
const ANCHO = 595.28;
const ALTO = 841.89;
const MARGEN = 42;
const UTIL = ANCHO - MARGEN * 2;

const NEGRO = rgb(0.06, 0.09, 0.16);
const GRIS = rgb(0.39, 0.45, 0.55);
const GRIS_CLARO = rgb(0.89, 0.91, 0.94);
const FONDO = rgb(0.97, 0.98, 0.99);
const ACENTO = rgb(0.2, 0.25, 0.33);

/**
 * Las fuentes estándar del PDF (Helvetica) solo tienen caracteres latinos:
 * se omite lo que no se puede dibujar (emojis, símbolos raros) para que no falle.
 */
function limpiar(texto: string, fuente: PDFFont) {
  const reemplazos: Record<string, string> = { " ": " ", " ": " ", " ": " ", "−": "-", "‐": "-", "‑": "-" };
  let salida = "";
  for (const ch of texto.replace(/\r/g, "")) {
    const c = reemplazos[ch] ?? ch;
    try {
      fuente.encodeText(c);
      salida += c;
    } catch {
      // Carácter que la fuente no tiene (emoji, símbolo raro): se omite.
    }
  }
  return salida.replace(/ {2,}/g, " ").trimEnd();
}

/** Corta un texto en líneas que entren en `ancho`. */
function partir(texto: string, fuente: PDFFont, tam: number, ancho: number): string[] {
  const lineas: string[] = [];
  for (const parrafo of limpiar(texto, fuente).split("\n")) {
    let actual = "";
    for (const palabra of parrafo.split(/\s+/)) {
      const prueba = actual ? `${actual} ${palabra}` : palabra;
      if (fuente.widthOfTextAtSize(prueba, tam) <= ancho) {
        actual = prueba;
        continue;
      }
      if (actual) lineas.push(actual);
      // Palabra más larga que la línea: se corta a la fuerza.
      let resto = palabra;
      while (fuente.widthOfTextAtSize(resto, tam) > ancho) {
        let n = resto.length;
        while (n > 1 && fuente.widthOfTextAtSize(resto.slice(0, n), tam) > ancho) n--;
        lineas.push(resto.slice(0, n));
        resto = resto.slice(n);
      }
      actual = resto;
    }
    lineas.push(actual);
  }
  return lineas;
}

const cantidadTexto = (c: number) => c.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const pesos = (n: number) => formatoPesos(n).replace(/ /g, " ");

export async function generarPdfPresupuesto(d: DatosPdf): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${d.titulo} ${d.numero} - ${d.taller.nombre}`);
  pdf.setAuthor(d.taller.nombre);
  pdf.setCreator("Taller App");
  pdf.setLanguage("es-AR");

  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  let pagina: PDFPage = pdf.addPage([ANCHO, ALTO]);
  let y = ALTO - MARGEN;

  const escribir = (t: string, x: number, yy: number, o: { tam?: number; fuente?: PDFFont; color?: typeof NEGRO; derecha?: boolean } = {}) => {
    const fuente = o.fuente ?? normal;
    const tam = o.tam ?? 10;
    const txt = limpiar(t, fuente);
    const xx = o.derecha ? x - fuente.widthOfTextAtSize(txt, tam) : x;
    pagina.drawText(txt, { x: xx, y: yy, size: tam, font: fuente, color: o.color ?? NEGRO });
  };

  // ─── Encabezado ─────────────────────────────────────────────────────────
  const lineasTaller = partir(d.taller.nombre, negrita, 18, UTIL * 0.58);
  lineasTaller.forEach((l, i) => escribir(l, MARGEN, y - 18 - i * 21, { tam: 18, fuente: negrita }));
  let yIzq = y - 18 - lineasTaller.length * 21;
  if (d.taller.telefono) {
    escribir(`Tel.: ${d.taller.telefono}`, MARGEN, yIzq, { color: GRIS });
    yIzq -= 14;
  }

  const xDer = ANCHO - MARGEN;
  escribir(d.titulo.toUpperCase(), xDer, y - 16, { tam: 15, fuente: negrita, color: ACENTO, derecha: true });
  escribir(`N.º ${d.numero}`, xDer, y - 33, { derecha: true, color: GRIS });
  escribir(`Fecha: ${formatoFecha(d.fecha)}`, xDer, y - 47, { derecha: true });
  let yDer = y - 61;
  if (d.validoHasta) {
    escribir(`Válido hasta: ${formatoFecha(d.validoHasta)}`, xDer, yDer, { derecha: true });
    yDer -= 14;
  }

  y = Math.min(yIzq, yDer) - 10;
  pagina.drawLine({ start: { x: MARGEN, y }, end: { x: xDer, y }, thickness: 1.5, color: ACENTO });
  y -= 22;

  // ─── Cliente y vehículo ─────────────────────────────────────────────────
  const col2 = MARGEN + UTIL / 2;
  escribir("CLIENTE", MARGEN, y, { tam: 8, fuente: negrita, color: GRIS });
  escribir("VEHÍCULO", col2, y, { tam: 8, fuente: negrita, color: GRIS });
  y -= 14;
  const datosCliente = d.cliente ? [d.cliente.nombre, d.cliente.telefono ? `Tel.: ${d.cliente.telefono}` : ""] : ["—"];
  const datosVehiculo = d.vehiculo
    ? [
        d.vehiculo.patente,
        [d.vehiculo.marca, d.vehiculo.modelo, d.vehiculo.anio].filter(Boolean).join(" "),
        d.kmIngreso != null ? `Km: ${formatoKm(d.kmIngreso)}` : "",
      ]
    : ["—"];
  const filasDatos = Math.max(datosCliente.length, datosVehiculo.length);
  for (let i = 0; i < filasDatos; i++) {
    if (datosCliente[i]) escribir(partir(datosCliente[i], i === 0 ? negrita : normal, 10.5, UTIL / 2 - 10)[0], MARGEN, y, { tam: 10.5, fuente: i === 0 ? negrita : normal });
    if (datosVehiculo[i]) escribir(datosVehiculo[i], col2, y, { tam: 10.5, fuente: i === 0 ? negrita : normal });
    y -= 14;
  }

  if (d.tipoTrabajo || d.descripcion) {
    y -= 8;
    escribir("TRABAJO", MARGEN, y, { tam: 8, fuente: negrita, color: GRIS });
    y -= 14;
    const texto = [d.tipoTrabajo ? labelTipoTrabajo(d.tipoTrabajo) : "", d.descripcion ?? ""].filter(Boolean).join(" — ");
    for (const l of partir(texto, normal, 10.5, UTIL)) {
      escribir(l, MARGEN, y, { tam: 10.5 });
      y -= 14;
    }
  }
  y -= 12;

  // ─── Tabla de items ─────────────────────────────────────────────────────
  const C = { codigo: MARGEN + 6, desc: MARGEN + 74, cant: MARGEN + UTIL * 0.66, unit: MARGEN + UTIL * 0.84, sub: xDer - 6 };
  const anchoDesc = C.cant - 40 - C.desc;

  const encabezadoTabla = () => {
    pagina.drawRectangle({ x: MARGEN, y: y - 6, width: UTIL, height: 20, color: ACENTO });
    escribir("Código", C.codigo, y, { tam: 8.5, fuente: negrita, color: rgb(1, 1, 1) });
    escribir("Descripción", C.desc, y, { tam: 8.5, fuente: negrita, color: rgb(1, 1, 1) });
    escribir("Cant.", C.cant, y, { tam: 8.5, fuente: negrita, color: rgb(1, 1, 1), derecha: true });
    escribir("P. unitario", C.unit, y, { tam: 8.5, fuente: negrita, color: rgb(1, 1, 1), derecha: true });
    escribir("Subtotal", C.sub, y, { tam: 8.5, fuente: negrita, color: rgb(1, 1, 1), derecha: true });
    y -= 22;
  };

  const nuevaPagina = () => {
    pagina = pdf.addPage([ANCHO, ALTO]);
    y = ALTO - MARGEN - 10;
    escribir(`${d.titulo} N.º ${d.numero} (continuación)`, MARGEN, y, { tam: 9, color: GRIS });
    y -= 22;
    encabezadoTabla();
  };

  encabezadoTabla();
  if (d.items.length === 0) {
    escribir("Sin repuestos ni mano de obra cargados.", C.desc, y, { color: GRIS });
    y -= 18;
  }
  let repuestos = 0;
  let manoObra = 0;
  d.items.forEach((it, i) => {
    const sub = Math.round(it.cantidad * it.precio * 100) / 100;
    if (it.tipo === "repuesto") repuestos += sub; else manoObra += sub;
    const lineas = partir(it.descripcion, normal, 9.5, anchoDesc);
    const alto = lineas.length * 12 + 8;
    if (y - alto < MARGEN + 40) nuevaPagina();
    if (i % 2 === 1) pagina.drawRectangle({ x: MARGEN, y: y - alto + 10, width: UTIL, height: alto, color: FONDO });
    escribir(partir(it.codigo ?? "", normal, 8.5, C.desc - C.codigo - 6)[0] ?? "", C.codigo, y, { tam: 8.5, color: GRIS });
    lineas.forEach((l, j) => escribir(l, C.desc, y - j * 12, { tam: 9.5 }));
    escribir(cantidadTexto(it.cantidad), C.cant, y, { tam: 9.5, derecha: true });
    escribir(pesos(it.precio), C.unit, y, { tam: 9.5, derecha: true });
    escribir(pesos(sub), C.sub, y, { tam: 9.5, fuente: negrita, derecha: true });
    y -= alto;
  });
  pagina.drawLine({ start: { x: MARGEN, y: y + 6 }, end: { x: xDer, y: y + 6 }, thickness: 0.75, color: GRIS_CLARO });

  // ─── Totales ────────────────────────────────────────────────────────────
  if (y < MARGEN + 120) nuevaPagina();
  y -= 12;
  const xEtiqueta = MARGEN + UTIL * 0.6;
  for (const [etq, valor] of [["Repuestos", repuestos], ["Mano de obra", manoObra]] as const) {
    escribir(etq, xEtiqueta, y, { color: GRIS });
    escribir(pesos(valor), C.sub, y, { derecha: true });
    y -= 15;
  }
  y -= 12; // aire entre "Mano de obra" y la franja del total
  pagina.drawRectangle({ x: xEtiqueta - 10, y: y - 9, width: xDer - xEtiqueta + 10, height: 26, color: ACENTO });
  escribir("TOTAL", xEtiqueta, y, { tam: 12, fuente: negrita, color: rgb(1, 1, 1) });
  escribir(pesos(d.total), C.sub, y, { tam: 13, fuente: negrita, color: rgb(1, 1, 1), derecha: true });
  y -= 40;

  // ─── Próximo service y condiciones ─────────────────────────────────────
  const notas: string[] = [];
  if (d.proximoService && (d.proximoService.fecha || d.proximoService.km)) {
    notas.push(
      `Próximo service: ${[
        d.proximoService.fecha ? `el ${formatoFecha(d.proximoService.fecha)}` : "",
        d.proximoService.km ? `a los ${formatoKm(d.proximoService.km)}` : "",
      ].filter(Boolean).join(" o ")}${d.proximoService.fecha && d.proximoService.km ? ", lo que ocurra primero" : ""}.`,
    );
  }
  notas.push("Precios en pesos argentinos.");
  if (d.validoHasta) {
    notas.push(`Presupuesto válido hasta el ${formatoFecha(d.validoHasta)}. Los precios de repuestos pueden variar después de esa fecha.`);
  }
  for (const n of notas) {
    for (const l of partir(n, normal, 9, UTIL)) {
      if (y < MARGEN + 10) nuevaPagina();
      escribir(l, MARGEN, y, { tam: 9, color: GRIS });
      y -= 12;
    }
  }

  // Número de página en todas.
  const paginas = pdf.getPages();
  paginas.forEach((p, i) => {
    const t = `Página ${i + 1} de ${paginas.length}`;
    p.drawText(t, { x: ANCHO - MARGEN - normal.widthOfTextAtSize(t, 8), y: MARGEN / 2, size: 8, font: normal, color: GRIS });
  });

  return pdf.save();
}
