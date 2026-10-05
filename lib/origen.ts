import { headers } from "next/headers";

/** "http://localhost:3000" o el dominio real, según desde dónde se está usando la app. */
export async function origenActual() {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export function linkInvitacion(origen: string, token: string) {
  return `${origen}/registro?invitacion=${token}`;
}
