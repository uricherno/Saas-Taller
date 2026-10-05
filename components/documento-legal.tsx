import Link from "next/link";

/** Marco común para /terminos y /privacidad (páginas públicas, sin sesión). */
export default function DocumentoLegal({
  titulo,
  actualizado,
  children,
}: {
  titulo: string;
  actualizado: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/registro" className="text-sm font-semibold tracking-wide text-blue-600 uppercase">
        Taller App
      </Link>
      <h1 className="mt-3 text-3xl font-bold text-slate-900">{titulo}</h1>
      <p className="mt-1 text-sm text-slate-500">Última actualización: {actualizado}</p>

      <div role="note" className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        <strong>Borrador.</strong> Este texto es una base de referencia y todavía no fue revisado por un abogado.
        Antes de usar la app con clientes reales tiene que revisarlo un profesional, que lo adapte a la actividad, a la
        empresa que presta el servicio y a la normativa vigente.
      </div>

      <article className="mt-8 space-y-6 text-slate-700 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:space-y-1">
        {children}
      </article>

      <nav className="mt-12 flex flex-wrap gap-4 border-t border-slate-200 pt-6 text-sm">
        <Link href="/terminos" className="font-medium text-blue-600 hover:underline">
          Términos y condiciones
        </Link>
        <Link href="/privacidad" className="font-medium text-blue-600 hover:underline">
          Política de privacidad
        </Link>
        <Link href="/registro" className="font-medium text-blue-600 hover:underline">
          Volver al registro
        </Link>
      </nav>
    </main>
  );
}
