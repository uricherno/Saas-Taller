/** Cada letra sin tilde acepta también sus variantes con tilde (en mayúscula o minúscula). */
const VARIANTES: Record<string, string> = {
  a: "aáàäAÁÀÄ",
  e: "eéèëEÉÈË",
  i: "iíìïIÍÌÏ",
  o: "oóòöOÓÒÖ",
  u: "uúùüUÚÙÜ",
  n: "nñNÑ",
};

/**
 * Filtros PostgREST para buscar en la lista: cada palabra tiene que aparecer en la
 * descripción o el código, sin importar mayúsculas ni tildes ("bujia" encuentra
 * "Bujía"). Usa expresiones regulares (`imatch`) armadas solo con letras, números
 * y unos pocos signos escapados, así lo que se escribe no puede romper el filtro.
 */
export function filtrosBusquedaPrecios(q: string): string[] {
  return q
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // saca las tildes de lo que se escribió
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.\-/+]/gu, " ") // solo letras, números y . - / +
    .trim()
    .split(/\s+/)
    .filter((p) => p.length > 0)
    .slice(0, 5)
    .map((palabra) => {
      const regex = [...palabra]
        .map((c) => (VARIANTES[c] ? `[${VARIANTES[c]}]` : /[.+]/.test(c) ? `[${c}]` : c))
        .join("");
      // Entre comillas para que PostgREST no interprete los signos del valor.
      return `descripcion.imatch."${regex}",codigo.imatch."${regex}"`;
    });
}
