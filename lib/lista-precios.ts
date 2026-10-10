// Versión empaquetada de ExcelJS (ver types/exceljs-dist.d.ts).
import ExcelJS from "exceljs/dist/exceljs.min.js";

// Lectura de listas de precios en Excel (.xlsx) o CSV, tal como vienen de
// proveedores o de un Excel propio. Detecta solas las columnas por su título.

export type FilaPrecio = {
  codigo: string;
  descripcion: string;
  tipo: "repuesto" | "mano_de_obra";
  precio: number;
};

export type ResultadoLectura = {
  filas: FilaPrecio[];
  /** Problemas por fila (no frenan la carga: esas filas se saltean). */
  avisos: string[];
  /** Columnas detectadas, para mostrarle al usuario qué se entendió. */
  columnas: { codigo: string | null; descripcion: string; tipo: string | null; precio: string };
};

export const MAX_FILAS = 20_000;
export const MAX_BYTES = 8 * 1024 * 1024;

const SINONIMOS = {
  codigo: ["codigo", "cod", "sku", "articulo", "art", "referencia", "ref", "id", "nro", "numero", "item"],
  descripcion: ["descripcion", "detalle", "producto", "nombre", "concepto", "denominacion", "articulo descripcion"],
  tipo: ["tipo", "categoria", "rubro", "clase"],
  // Los más específicos primero: si hay "Precio costo" y "Precio venta", gana el de venta.
  precio: ["precio venta", "precio de venta", "precio final", "precio publico", "precio lista", "precio con iva", "pvp", "precio unitario", "precio", "importe", "valor", "unitario"],
};

/** "Descripción del Artículo" → "descripcion del articulo" */
function normalizar(t: string) {
  return t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function encontrarColumna(encabezados: string[], campo: keyof typeof SINONIMOS, excluir: number[] = []) {
  const norm = encabezados.map(normalizar);
  // El precio de costo/compra nunca es el precio para el cliente.
  if (campo === "precio") norm.forEach((h, i) => { if (/costo|compra|proveedor/.test(h)) excluir = [...excluir, i]; });
  // 1º coincidencia exacta, 2º el título empieza con un sinónimo ("precio unit. c/iva").
  for (const pasada of ["exacta", "prefijo"] as const) {
    for (const s of SINONIMOS[campo]) {
      const i = norm.findIndex((h, idx) => !excluir.includes(idx) && (pasada === "exacta" ? h === s : h.startsWith(s)));
      if (i >= 0) return i;
    }
  }
  return -1;
}

/**
 * Precio escrito de cualquier forma común → número.
 * "$ 15.000,50" · "15.000" · "15000.5" · "15,000.50" · "15000" · 15000.5
 */
export function leerPrecio(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : null;
  let t = String(valor ?? "").replace(/[\s$]|ARS|AR\$/gi, "");
  if (!t) return null;
  const coma = t.lastIndexOf(",");
  const punto = t.lastIndexOf(".");
  if (coma >= 0 && punto >= 0) {
    // El separador que aparece último es el decimal.
    t = coma > punto ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  } else if (coma >= 0) {
    // Solo coma: decimal ("15000,5") salvo que sean miles ("15,000").
    t = /^\d{1,3}(,\d{3})+$/.test(t) ? t.replace(/,/g, "") : t.replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ""); // "15.000" = quince mil
  }
  if (!/^\d+(\.\d+)?$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

function leerTipo(valor: string, porDefecto: FilaPrecio["tipo"]): FilaPrecio["tipo"] {
  const v = normalizar(valor);
  if (!v) return porDefecto;
  if (/mano|^mo$|servicio|labor|trabajo/.test(v)) return "mano_de_obra";
  return "repuesto";
}

/** Saca el apóstrofo que agrega nuestra exportación CSV delante de =, +, - o @. */
function sinProteccionExcel(t: string) {
  return /^'[=+\-@]/.test(t) ? t.slice(1) : t;
}

/** Código a partir de la descripción, para listas sin columna de código. */
function codigoDesdeDescripcion(d: string) {
  return normalizar(d).toUpperCase().replace(/ /g, "-").slice(0, 60);
}

// ─── CSV ──────────────────────────────────────────────────────────────────

function decodificarTexto(buffer: Buffer) {
  const utf8 = new TextDecoder("utf-8").decode(buffer); // quita el BOM si está
  // Excel en Windows guarda CSV en ANSI (windows-1252): ahí "ñ" aparece como "�".
  return utf8.includes("�") ? new TextDecoder("windows-1252").decode(buffer) : utf8;
}

type Fila = { numero: number; celdas: (string | number)[] };

function parsearCsv(texto: string): Fila[] {
  const primeraLinea = texto.split(/\r?\n/, 1)[0] ?? "";
  const separador = [";", ",", "\t"].reduce((mejor, s) =>
    primeraLinea.split(s).length > primeraLinea.split(mejor).length ? s : mejor,
  );

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { celda += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else celda += c;
    } else if (c === '"') entreComillas = true;
    else if (c === separador) { fila.push(celda); celda = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda); filas.push(fila); fila = []; celda = "";
    } else celda += c;
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila); }
  // Se guarda el número de fila original (como en Excel) antes de descartar las vacías.
  return filas.map((celdas, i) => ({ numero: i + 1, celdas })).filter((f) => f.celdas.some((x) => x.trim()));
}

// ─── Excel ────────────────────────────────────────────────────────────────

function textoDeCelda(v: ExcelJS.CellValue): string | number {
  if (v === null || v === undefined) return "";
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "1" : "0";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v) return textoDeCelda((v as ExcelJS.CellFormulaValue).result as ExcelJS.CellValue); // fórmula
    if ("richText" in v) return (v as ExcelJS.CellRichTextValue).richText.map((r) => r.text).join("");
    if ("text" in v) return String((v as ExcelJS.CellHyperlinkValue).text);
  }
  return String(v);
}

async function parsearXlsx(buffer: Buffer): Promise<Fila[]> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(buffer as unknown as ArrayBuffer);
  // La primera hoja que tenga datos.
  const hoja = libro.worksheets.find((h) => h.actualRowCount > 0);
  if (!hoja) return [];
  const filas: Fila[] = [];
  hoja.eachRow({ includeEmpty: false }, (row) => {
    const valores = row.values as ExcelJS.CellValue[]; // índice 0 vacío
    filas.push({ numero: row.number, celdas: valores.slice(1).map(textoDeCelda) });
  });
  return filas;
}

// ─── Lectura completa ────────────────────────────────────────────────────

export async function leerListaPrecios(
  nombreArchivo: string,
  buffer: Buffer,
  tipoPorDefecto: FilaPrecio["tipo"] = "repuesto",
): Promise<ResultadoLectura | { error: string }> {
  if (buffer.length > MAX_BYTES) return { error: "El archivo pesa más de 8 MB." };
  const ext = nombreArchivo.toLowerCase().split(".").pop();

  let tabla: Fila[];
  try {
    if (ext === "xlsx") tabla = await parsearXlsx(buffer);
    else if (ext === "csv" || ext === "txt") tabla = parsearCsv(decodificarTexto(buffer));
    else if (ext === "xls") return { error: "El formato .xls (Excel viejo) no se puede leer. Abrilo en Excel y guardalo como .xlsx o .csv." };
    else return { error: "Subí un archivo .xlsx o .csv." };
  } catch {
    return { error: "No se pudo leer el archivo. ¿Está dañado o protegido con contraseña?" };
  }

  // La fila de títulos puede no ser la primera (listas con logo o fecha arriba).
  let filaTitulos = -1;
  let cols = { codigo: -1, descripcion: -1, tipo: -1, precio: -1 };
  for (let i = 0; i < Math.min(tabla.length, 15); i++) {
    const enc = tabla[i].celdas.map((x) => String(x));
    const precio = encontrarColumna(enc, "precio");
    const descripcion = encontrarColumna(enc, "descripcion", [precio]);
    if (precio >= 0 && descripcion >= 0) {
      const codigo = encontrarColumna(enc, "codigo", [precio, descripcion]);
      const tipo = encontrarColumna(enc, "tipo", [precio, descripcion, codigo]);
      filaTitulos = i;
      cols = { codigo, descripcion, tipo, precio };
      break;
    }
  }
  if (filaTitulos < 0) {
    return {
      error:
        "No encontré las columnas. El archivo tiene que tener una fila de títulos con, al menos, “Descripción” y “Precio” (y si puede, “Código” y “Tipo”).",
    };
  }

  const titulos = tabla[filaTitulos].celdas.map((x) => String(x));
  const datos = tabla.slice(filaTitulos + 1);
  if (datos.length > MAX_FILAS) return { error: `El archivo tiene más de ${MAX_FILAS.toLocaleString("es-AR")} filas.` };

  const avisos: string[] = [];
  const porCodigo = new Map<string, FilaPrecio>();
  datos.forEach(({ numero: nroFila, celdas: f }) => {
    const descripcion = sinProteccionExcel(String(f[cols.descripcion] ?? "").trim()).replace(/\s+/g, " ").slice(0, 300);
    const crudoPrecio = f[cols.precio];
    if (!descripcion && (crudoPrecio === "" || crudoPrecio === undefined)) return; // fila vacía o separador

    const precio = leerPrecio(crudoPrecio);
    if (!descripcion) return void avisos.push(`Fila ${nroFila}: sin descripción, se saltea.`);
    if (precio === null) return void avisos.push(`Fila ${nroFila} (${descripcion}): el precio “${crudoPrecio}” no es un número, se saltea.`);

    const codigo =
      (cols.codigo >= 0 ? sinProteccionExcel(String(f[cols.codigo] ?? "").trim()).slice(0, 60) : "") ||
      codigoDesdeDescripcion(descripcion);
    if (porCodigo.has(codigo)) avisos.push(`Fila ${nroFila}: el código ${codigo} está repetido; se usa el último.`);
    porCodigo.set(codigo, {
      codigo,
      descripcion,
      tipo: cols.tipo >= 0 ? leerTipo(String(f[cols.tipo] ?? ""), tipoPorDefecto) : tipoPorDefecto,
      precio,
    });
  });

  return {
    filas: [...porCodigo.values()],
    avisos,
    columnas: {
      codigo: cols.codigo >= 0 ? titulos[cols.codigo] : null,
      descripcion: titulos[cols.descripcion],
      tipo: cols.tipo >= 0 ? titulos[cols.tipo] : null,
      precio: titulos[cols.precio],
    },
  };
}
