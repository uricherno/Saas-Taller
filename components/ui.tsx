import Link from "next/link";

export function TarjetaAuth({
  titulo,
  subtitulo,
  children,
  pie,
}: {
  titulo: string;
  subtitulo: string;
  children: React.ReactNode;
  pie: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="text-sm font-semibold tracking-wide text-blue-600 uppercase">
            Taller App
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">{titulo}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitulo}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-slate-600">{pie}</p>
      </div>
    </main>
  );
}

const ESTILO_INPUT =
  "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none";

function Etiqueta({ label, opcional }: { label: string; opcional?: boolean }) {
  return (
    <span className="mb-1 block text-sm font-medium text-slate-700">
      {label}
      {opcional && <span className="font-normal text-slate-400"> (opcional)</span>}
    </span>
  );
}

export function Campo({
  label,
  opcional,
  ...props
}: { label: string; opcional?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <Etiqueta label={label} opcional={opcional} />
      <input {...props} className={ESTILO_INPUT} />
    </label>
  );
}

export function AreaTexto({
  label,
  opcional,
  ...props
}: { label: string; opcional?: boolean } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <Etiqueta label={label} opcional={opcional} />
      <textarea rows={3} {...props} className={ESTILO_INPUT} />
    </label>
  );
}

export function Selector({
  label,
  opciones,
  ...props
}: {
  label: string;
  opciones: readonly { valor: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <Etiqueta label={label} />
      <select {...props} className={ESTILO_INPUT}>
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function BotonLink({
  href,
  variante = "primario",
  children,
}: {
  href: string;
  variante?: "primario" | "secundario";
  children: React.ReactNode;
}) {
  const estilos =
    variante === "primario"
      ? "bg-blue-600 text-white hover:bg-blue-700"
      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100";
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition ${estilos}`}
    >
      {children}
    </Link>
  );
}

export function Tarjeta({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>
  );
}

export function Volver({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-4 inline-block text-sm font-medium text-blue-600 hover:underline">
      ← {children}
    </Link>
  );
}

export function Alerta({ tipo, children }: { tipo: "error" | "exito"; children: React.ReactNode }) {
  const estilos =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-green-200 bg-green-50 text-green-800";
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </p>
  );
}

export function BotonEnviar({ cargando, children }: { cargando: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={cargando}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-base font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {cargando ? "Procesando…" : children}
    </button>
  );
}
