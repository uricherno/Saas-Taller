export type EstadoForm = {
  error?: string;
  exito?: string;
  valores?: Record<string, string>;
};

export function texto(formData: FormData, campo: string) {
  return String(formData.get(campo) ?? "").trim();
}

/** Convierte un texto en entero; "" → null, inválido → NaN. */
export function entero(valor: string): number | null {
  if (valor === "") return null;
  const limpio = valor.replace(/[.\s]/g, ""); // admite "120.000"
  return /^\d+$/.test(limpio) ? Number(limpio) : NaN;
}

/**
 * Convierte un monto o cantidad escrito al estilo argentino en número.
 * "1.500,50" → 1500.5 · "1500.5" → 1500.5 · "1.500" → 1500 · "" → null · inválido → NaN
 */
export function decimal(valor: string): number | null {
  let v = valor.replace(/[\s$]/g, "");
  if (v === "") return null;
  if (v.includes(",")) {
    v = v.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(v)) {
    v = v.replace(/\./g, ""); // puntos de miles
  }
  return /^\d+(\.\d+)?$/.test(v) ? Number(v) : NaN;
}
