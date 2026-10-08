// Constantes de las fotos de las órdenes (se usan también en el navegador).
// Las consultas están en lib/fotos-servidor.ts.

/** Bucket privado de Supabase Storage (migración 20261011). */
export const BUCKET_FOTOS = "fotos-ordenes";

export const TIPOS_IMAGEN = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as const;

export const TIPOS_FOTO = [
  { valor: "auto", label: "Estado del auto" },
  { valor: "problema", label: "Problema" },
] as const;

export type FotoOrden = {
  id: string;
  tipo: string;
  nota: string | null;
  subidaPor: string | null;
  url: string | null;
};
