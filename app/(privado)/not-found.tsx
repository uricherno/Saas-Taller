import { BotonLink, Tarjeta } from "@/components/ui";

export default function NoEncontrado() {
  return (
    <Tarjeta className="text-center">
      <h1 className="text-lg font-semibold text-slate-900">No encontramos lo que buscabas</h1>
      <p className="mt-1 text-sm text-slate-600">Puede que se haya eliminado o que no pertenezca a tu taller.</p>
      <div className="mt-4">
        <BotonLink href="/clientes">Ir a clientes</BotonLink>
      </div>
    </Tarjeta>
  );
}
