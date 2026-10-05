/**
 * Normaliza un teléfono para usarlo en wa.me (solo dígitos, con código de país).
 * Para números argentinos asegura el formato de celular internacional: 54 9 + área + número.
 *
 *   "11 2345-6789"        → "5491123456789"
 *   "011 15 2345-6789"    → "5491123456789"
 *   "+54 9 351 123-4567"  → "5493511234567"
 *   "+54 11 2345 6789"    → "5491123456789"  (agrega el 9)
 *   "+598 94 123 456"     → "59894123456"    (otro país: se respeta)
 *   "1234"                → null             (inválido)
 */
export function normalizarTelefono(telefono: string | null | undefined): string | null {
  if (!telefono) return null;
  const crudo = telefono.trim();
  let d = crudo.replace(/\D/g, "");
  if (!d) return null;

  const internacional = crudo.startsWith("+") || d.startsWith("00");
  if (d.startsWith("00")) d = d.slice(2);

  // Número de otro país escrito con prefijo internacional: se deja como está.
  if (internacional && !d.startsWith("54")) {
    return d.length >= 8 && d.length <= 15 ? d : null;
  }

  // Quitar el código de país para trabajar con el número nacional.
  if (d.startsWith("549")) d = d.slice(3);
  else if (d.startsWith("54") && d.length >= 12) d = d.slice(2);

  // Quitar el 0 de larga distancia (011…, 0351…).
  if (d.startsWith("0")) d = d.slice(1);

  // Quitar el 15 de celular que va después del código de área (2, 3 o 4 dígitos).
  if (d.length === 12) {
    for (const largoArea of [2, 3, 4]) {
      if (d.slice(largoArea, largoArea + 2) === "15") {
        d = d.slice(0, largoArea) + d.slice(largoArea + 2);
        break;
      }
    }
  }

  // Un número nacional argentino tiene 10 dígitos (área + abonado), y los códigos
  // de área empiezan con 11, 2 o 3 (así se detecta cuando falta el área).
  return /^(11|[23])\d+$/.test(d) && d.length === 10 ? `549${d}` : null;
}

/** Link para abrir un chat de WhatsApp, opcionalmente con un mensaje ya escrito. */
export function linkWhatsapp(telefono: string | null | undefined, mensaje?: string): string | null {
  const numero = normalizarTelefono(telefono);
  if (!numero) return null;
  return `https://wa.me/${numero}${mensaje ? `?text=${encodeURIComponent(mensaje)}` : ""}`;
}
