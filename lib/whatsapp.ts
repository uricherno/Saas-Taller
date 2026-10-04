/** Link para abrir un chat de WhatsApp. El teléfono debería incluir código de país (ej: 54 9 11…). */
export function linkWhatsapp(telefono: string | null): string | null {
  const digitos = telefono?.replace(/\D/g, "") ?? "";
  return digitos.length >= 8 ? `https://wa.me/${digitos}` : null;
}
