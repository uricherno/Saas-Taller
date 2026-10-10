import type { Metadata } from "next";
import Link from "next/link";

// Página pública de presentación. Con sesión iniciada, el proxy lleva directo a /inicio.
export const metadata: Metadata = {
  title: { absolute: "Taller App · Gestión para talleres mecánicos" },
  description:
    "Órdenes, presupuestos, turnos online y avisos por WhatsApp para tu taller. El cliente sigue su auto desde el celular.",
};

const FUNCIONES = [
  {
    icono: "🧾",
    titulo: "Órdenes y presupuestos",
    texto: "Cargás repuestos y mano de obra desde tu lista de precios, y el presupuesto sale en PDF listo para mandar.",
  },
  {
    icono: "💬",
    titulo: "Avisos por WhatsApp",
    texto: "“Recibimos tu auto”, “encontramos esto”, “ya está listo”: el mensaje sale armado y lo mandás con un toque.",
  },
  {
    icono: "📱",
    titulo: "El cliente sigue su auto",
    texto: "Le pasás un link: ve el estado, las fotos de lo que falla, el presupuesto y lo que ya pagó. Y acepta desde ahí.",
  },
  {
    icono: "📅",
    titulo: "Turnos online",
    texto: "Una página para que tus clientes saquen turno solos, en los horarios que vos definís. Sin llamadas.",
  },
  {
    icono: "🔔",
    titulo: "Recordatorios de service",
    texto: "Te avisa a quién le toca el service por fecha o por kilometraje, y lo traés de vuelta con un WhatsApp.",
  },
  {
    icono: "💵",
    titulo: "Cobros y saldos",
    texto: "Señas, pagos parciales y quién te debe. Todo a la vista, sin cuadernos.",
  },
  {
    icono: "📦",
    titulo: "Lista de precios y stock",
    texto: "Subís tu Excel de precios, la app te avisa cuando un repuesto está por acabarse.",
  },
  {
    icono: "👥",
    titulo: "Tu equipo, con permisos",
    texto: "Dueño, recepción y mecánico: cada uno ve y hace lo que le corresponde.",
  },
];

const PASOS = [
  { numero: "1", titulo: "Registrá tu taller", texto: "Te lleva dos minutos. No hace falta instalar nada." },
  { numero: "2", titulo: "Cargá clientes y autos", texto: "A medida que van llegando, o subí tu lista de precios en Excel." },
  { numero: "3", titulo: "Trabajá desde el celular", texto: "Órdenes, fotos, avisos y cobros desde el mostrador o el foso." },
];

const PREGUNTAS = [
  {
    p: "¿Necesito instalar algo?",
    r: "No. Funciona en el navegador de la compu y del celular. Si querés, la agregás a la pantalla de inicio y se abre como una app.",
  },
  {
    p: "¿Mis datos están seguros?",
    r: "Cada taller ve solo sus datos, y cada persona del equipo solo lo que su rol le permite. Podés exportar todo a Excel cuando quieras.",
  },
  {
    p: "¿Tengo que conectar WhatsApp?",
    r: "No. Los botones abren tu propio WhatsApp con el mensaje armado. Lo mandás vos, como siempre.",
  },
  {
    p: "¿El cliente tiene que crearse una cuenta?",
    r: "No. Recibe un link por WhatsApp y lo abre directo, sin registrarse.",
  },
];

function Boton({ href, children, variante = "primario" }: { href: string; children: React.ReactNode; variante?: "primario" | "secundario" }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold transition ${
        variante === "primario"
          ? "bg-blue-600 text-white shadow-sm hover:bg-blue-700"
          : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100"
      }`}
    >
      {children}
    </Link>
  );
}

export default function Landing() {
  return (
    <div className="flex flex-1 flex-col bg-white text-slate-900">
      {/* Barra superior */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm text-white">
              TA
            </span>
            Taller App
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Ingresar
            </Link>
            <Link href="/registro" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700">
              Empezar gratis
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-slate-50 to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
            <div className="space-y-6">
              <p className="inline-block rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800">
                Hecho para talleres mecánicos
              </p>
              <h1 className="text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
                Tu taller ordenado, y tus clientes avisados por WhatsApp.
              </h1>
              <p className="text-lg text-slate-600">
                Órdenes, presupuestos, turnos y cobros en un solo lugar. El cliente sigue el estado de su auto desde el
                celular y acepta el presupuesto con un toque.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Boton href="/registro">Registrá tu taller gratis</Boton>
                <Boton href="/login" variante="secundario">
                  Ya tengo cuenta
                </Boton>
              </div>
              <p className="text-sm text-slate-500">Sin instalar nada · Desde la compu o el celular</p>
            </div>

            {/* Ejemplo de lo que ve el cliente */}
            <div aria-hidden className="mx-auto w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
              <p className="text-xs font-semibold text-slate-500">Taller El Pistón</p>
              <div className="mt-1 flex items-center justify-between">
                <p className="text-lg font-bold">Tu Gol · AB123CD</p>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">En proceso</span>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="aspect-square rounded-lg bg-slate-200" />
                <div className="aspect-square rounded-lg bg-slate-300" />
                <div className="aspect-square rounded-lg bg-slate-200" />
              </div>
              <ul className="mt-4 space-y-1 text-sm">
                <li className="flex justify-between"><span>Pastillas delanteras</span><span>$ 48.000</span></li>
                <li className="flex justify-between"><span>Mano de obra</span><span>$ 35.000</span></li>
                <li className="flex justify-between border-t border-slate-200 pt-1 font-bold"><span>Total</span><span>$ 83.000</span></li>
                <li className="flex justify-between text-green-700"><span>Seña</span><span>− $ 30.000</span></li>
                <li className="flex justify-between font-bold"><span>Saldo</span><span>$ 53.000</span></li>
              </ul>
              <p className="mt-4 rounded-xl bg-green-600 py-2.5 text-center text-sm font-semibold text-white">✓ Presupuesto aceptado</p>
            </div>
          </div>
        </section>

        {/* Funciones */}
        <section className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-center text-3xl font-bold">Todo lo que pasa en el taller, en una app</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">
            Pensada para usar con las manos ocupadas: botones grandes, pocos pasos y todo en castellano.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FUNCIONES.map((f) => (
              <li key={f.titulo} className="rounded-2xl border border-slate-200 p-5">
                <span aria-hidden className="text-3xl">{f.icono}</span>
                <h3 className="mt-3 font-semibold">{f.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{f.texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Cómo funciona */}
        <section className="bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 className="text-center text-3xl font-bold">Empezás hoy mismo</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {PASOS.map((p) => (
                <li key={p.numero} className="rounded-2xl bg-white p-6 shadow-sm">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">{p.numero}</span>
                  <h3 className="mt-4 text-lg font-semibold">{p.titulo}</h3>
                  <p className="mt-1 text-slate-600">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Preguntas */}
        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-3xl font-bold">Preguntas frecuentes</h2>
          <div className="mt-8 space-y-3">
            {PREGUNTAS.map((q) => (
              <details key={q.p} className="group rounded-xl border border-slate-200 p-4">
                <summary className="cursor-pointer list-none font-semibold marker:hidden">
                  <span className="mr-2 inline-block transition group-open:rotate-90">›</span>
                  {q.p}
                </summary>
                <p className="mt-2 text-slate-600">{q.r}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Llamado final */}
        <section className="bg-slate-900 text-white">
          <div className="mx-auto max-w-4xl space-y-5 px-4 py-14 text-center">
            <h2 className="text-3xl font-bold">Dejá el cuaderno. Probalo en tu taller.</h2>
            <p className="text-slate-300">Registrá tu taller y cargá tu primera orden en cinco minutos.</p>
            <Link
              href="/registro"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-base font-semibold text-slate-900 hover:bg-slate-100"
            >
              Registrá tu taller gratis
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Taller App</p>
          <nav className="flex gap-4">
            <Link href="/terminos" className="hover:underline">Términos</Link>
            <Link href="/privacidad" className="hover:underline">Privacidad</Link>
            <Link href="/login" className="hover:underline">Ingresar</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
