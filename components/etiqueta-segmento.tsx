import { infoSegmento, type Segmento } from "@/lib/crm";

export default function EtiquetaSegmento({ segmento }: { segmento: Segmento }) {
  const { label, color, descripcion } = infoSegmento(segmento);
  return (
    <span title={descripcion} className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
