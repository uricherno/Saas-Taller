import { infoEstado } from "@/lib/ordenes";

export default function EtiquetaEstado({ estado }: { estado: string }) {
  const { label, color } = infoEstado(estado);
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}
