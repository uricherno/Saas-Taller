import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { filtrosBusquedaPrecios } from "@/lib/busqueda-precios";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { Tarjeta } from "@/components/ui";
import { FilaPrecio, FormCargaLista, FormPrecio, type ItemLista } from "./componentes-precios";

export const metadata: Metadata = { title: "Lista de precios" };

const POR_PAGINA = 100;

const fecha = new Intl.DateTimeFormat("es-AR", { timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric" });
const fechaHora = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
});

export default async function PreciosPage({ searchParams }: PageProps<"/precios">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const verInactivos = sp.inactivos === "1";
  const soloStockBajo = sp.stock === "bajo";
  const pagina = Math.max(1, Number(sp.pagina) || 1);

  const { tallerId, rol } = await obtenerSesion();
  const puedeEditar = puede(rol, "listaPrecios");
  const supabase = await createClient();

  // Sin la migración 20261012 no existen las columnas de stock: se consulta sin ellas.
  const { data: bajos, error: errorStock } = await supabase.from("precios_stock_bajo").select("id").eq("taller_id", tallerId).limit(1000);
  const conStock = !errorStock;

  const consultar = () => {
    let consulta = supabase
      .from("precios")
      .select(`id, codigo, descripcion, tipo, precio, activo, actualizado_en${conStock ? ", stock, stock_minimo" : ""}`, { count: "exact" })
      .eq("taller_id", tallerId)
      .eq("activo", !verInactivos)
      .order("descripcion")
      .range(0, pagina * POR_PAGINA - 1);
    for (const filtro of filtrosBusquedaPrecios(q)) consulta = consulta.or(filtro);
    if (soloStockBajo && conStock) consulta = consulta.in("id", (bajos ?? []).map((b) => b.id));
    return consulta.overrideTypes<{ id: string; codigo: string; descripcion: string; tipo: string; precio: number | string; activo: boolean; actualizado_en: string; stock?: number | string | null; stock_minimo?: number | string | null }[], { merge: false }>();
  };

  const [{ data: items, count, error }, { data: ultimaCarga }] = await Promise.all([
    consultar(),
    supabase
      .from("precios_cargas")
      .select("archivo, nuevos, actualizados, creado_en")
      .eq("taller_id", tallerId)
      .order("creado_en", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudo cargar la lista de precios."}
      </p>
    );
  }

  // Historial de los ítems visibles (para "antes $X" y el detalle).
  const ids = (items ?? []).map((i) => i.id);
  const { data: historial } = ids.length
    ? await supabase
        .from("precios_historial")
        .select("precio_id, precio, desde")
        .eq("taller_id", tallerId)
        .in("precio_id", ids)
        .order("desde", { ascending: false })
        .limit(5000)
    : { data: [] };
  const porItem = new Map<string, { precio: number; fecha: string }[]>();
  for (const h of historial ?? []) {
    const lista = porItem.get(h.precio_id) ?? [];
    lista.push({ precio: Number(h.precio), fecha: fecha.format(new Date(h.desde)) });
    porItem.set(h.precio_id, lista);
  }

  const lista: ItemLista[] = (items ?? []).map((i) => {
    const h = porItem.get(i.id) ?? [];
    return {
      ...i,
      stock: i.stock == null ? null : Number(i.stock),
      stockMinimo: i.stock_minimo == null ? null : Number(i.stock_minimo),
      actualizado: fecha.format(new Date(i.actualizado_en)),
      anterior: h[1] ?? null, // h[0] es el precio vigente
      historial: h,
    };
  });

  const url = (cambios: Record<string, string | null>) => {
    const p = new URLSearchParams();
    const base = { q: q || null, inactivos: verInactivos ? "1" : null, stock: soloStockBajo ? "bajo" : null, ...cambios };
    for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/precios?${s}` : "/precios";
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Lista de precios</h1>
        <p className="text-sm text-slate-500">
          Base para armar presupuestos: al cargar items en una orden, elegís de esta lista y el precio se completa solo.
          {ultimaCarga && ` Última actualización: “${ultimaCarga.archivo}” el ${fechaHora.format(new Date(ultimaCarga.creado_en))}.`}
        </p>
      </div>

      {puedeEditar && (
        <Tarjeta>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-900">Actualizar con un archivo</h2>
            <a href="/api/exportar/precios" download className="text-sm font-medium text-blue-600 hover:underline">
              Descargar la lista actual (para editarla en Excel)
            </a>
          </div>
          <FormCargaLista />
        </Tarjeta>
      )}

      <section className="space-y-3">
        <form className="flex gap-2">
          {verInactivos && <input type="hidden" name="inactivos" value="1" />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Buscar por descripción o código"
            aria-label="Buscar en la lista de precios"
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
          <button type="submit" className="shrink-0 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Buscar
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-slate-500">
            {count ?? 0}{" "}
            {count === 1
              ? verInactivos ? "desactivado" : "ítem activo"
              : verInactivos ? "desactivados" : "ítems activos"}
            {q && ` con “${q}”`}
            {soloStockBajo && " con stock bajo"}
          </p>
          <span className="flex flex-wrap gap-3">
            {conStock && (
              <Link href={url({ stock: soloStockBajo ? null : "bajo", pagina: null })} className="font-medium text-blue-600 hover:underline">
                {soloStockBajo ? "Ver todos" : `Stock bajo (${bajos?.length ?? 0})`}
              </Link>
            )}
            <Link href={url({ inactivos: verInactivos ? null : "1", pagina: null })} className="font-medium text-blue-600 hover:underline">
              {verInactivos ? "Ver activos" : "Ver desactivados"}
            </Link>
          </span>
        </div>

        {lista.length === 0 ? (
          <Tarjeta className="text-center text-slate-600">
            {soloStockBajo
              ? "No hay repuestos con stock bajo."
              : q
              ? "No hay ítems con esa búsqueda."
              : puedeEditar
                ? "La lista está vacía. Subí un archivo o agregá ítems a mano."
                : "Todavía no hay lista de precios. La carga el dueño del taller."}
          </Tarjeta>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {lista.map((i) => (
              <FilaPrecio key={i.id} item={i} puedeEditar={puedeEditar} conStock={conStock} />
            ))}
          </ul>
        )}

        {(count ?? 0) > lista.length && (
          <Link href={url({ pagina: String(pagina + 1) })} className="block text-center text-sm font-medium text-blue-600 hover:underline">
            Mostrar más ({(count ?? 0) - lista.length} restantes)
          </Link>
        )}
      </section>

      {puedeEditar && (
        <Tarjeta>
          <h2 className="mb-3 font-semibold text-slate-900">Agregar un ítem a mano</h2>
          <FormPrecio id={null} conStock={conStock} />
        </Tarjeta>
      )}
    </div>
  );
}
