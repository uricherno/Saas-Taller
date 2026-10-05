/** "ab 123-cd" → "AB123CD": así "AB 123 CD" y "ab123cd" cuentan como la misma patente. */
export function normalizarPatente(p: string) {
  return p.toUpperCase().replace(/[\s.-]/g, "");
}

/** Texto seguro para usar en un filtro ilike de PostgREST (solo letras y números). */
export function terminoBusquedaPatente(q: string) {
  return normalizarPatente(q).replace(/[^A-Z0-9]/g, "").slice(0, 10);
}
