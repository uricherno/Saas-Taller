// Valores tal como se guardan en la tabla pagos (migración 20261010).

export const MEDIOS_PAGO = [
  { valor: "efectivo", label: "Efectivo" },
  { valor: "transferencia", label: "Transferencia" },
  { valor: "mercadopago", label: "Mercado Pago" },
  { valor: "debito", label: "Débito" },
  { valor: "credito", label: "Crédito" },
  { valor: "cheque", label: "Cheque" },
  { valor: "otro", label: "Otro" },
] as const;

export type MedioPago = (typeof MEDIOS_PAGO)[number]["valor"];

export function esMedioPago(v: string): v is MedioPago {
  return MEDIOS_PAGO.some((m) => m.valor === v);
}

export function labelMedioPago(v: string) {
  return MEDIOS_PAGO.find((m) => m.valor === v)?.label ?? v;
}

export const CONCEPTOS_PAGO = [
  { valor: "pago", label: "Pago" },
  { valor: "sena", label: "Seña" },
] as const;

export function labelConcepto(v: string) {
  return CONCEPTOS_PAGO.find((c) => c.valor === v)?.label ?? v;
}

/** Suma montos en centavos (evita errores de redondeo). */
export function sumarMontos(montos: (number | string | null | undefined)[]) {
  return montos.reduce<number>((a, m) => a + Math.round(Number(m ?? 0) * 100), 0) / 100;
}
