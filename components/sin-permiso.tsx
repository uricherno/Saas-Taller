import { BotonLink, Tarjeta } from "@/components/ui";

/** Se muestra cuando el rol del usuario no permite ver una pantalla. */
export default function SinPermiso({ que }: { que: string }) {
  return (
    <Tarjeta className="text-center">
      <h1 className="text-lg font-semibold text-slate-900">No tenés acceso a {que}</h1>
      <p className="mt-1 text-sm text-slate-600">Tu rol no lo permite. Si lo necesitás, pedíselo al dueño del taller.</p>
      <div className="mt-4">
        <BotonLink href="/inicio">Volver al inicio</BotonLink>
      </div>
    </Tarjeta>
  );
}
