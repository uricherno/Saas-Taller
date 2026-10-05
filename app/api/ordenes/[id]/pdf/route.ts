import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { generarPdfPresupuesto } from "@/lib/pdf-presupuesto";

/** Días de validez que se imprimen en los presupuestos. */
const DIAS_VALIDEZ = 7;

type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

function sumarDias(iso: string, dias: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const hoyArgentina = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" });

// GET /api/ordenes/:id/pdf → presupuesto u orden de trabajo en PDF, para descargar o compartir.
export async function GET(request: NextRequest, { params }: RouteContext<"/api/ordenes/[id]/pdf">) {
  const { id } = await params;
  const { tallerId, taller } = await obtenerSesion(); // sin sesión → redirige a /login
  const supabase = await createClient();

  const [{ data: orden }, { data: datosTaller }] = await Promise.all([
    supabase
      .from("ordenes_trabajo")
      .select(
        `id, fecha, estado, tipo_trabajo, km_ingreso, descripcion, total, proximo_service_fecha, proximo_service_km,
         vehiculos(patente, marca, modelo, anio, clientes(nombre, telefono)),
         items_orden(codigo, descripcion, tipo, cantidad, precio_unitario)`,
      )
      .eq("id", id)
      .eq("taller_id", tallerId)
      .order("tipo", { referencedTable: "items_orden", ascending: false }) // repuestos primero
      .maybeSingle(),
    supabase.from("talleres").select("telefono").eq("id", tallerId).maybeSingle(),
  ]);

  if (!orden) return NextResponse.json({ error: "No se encontró la orden." }, { status: 404 });

  const vehiculo = uno(orden.vehiculos as Uno<{ patente: string; marca: string | null; modelo: string | null; anio: number | null; clientes: Uno<{ nombre: string; telefono: string | null }> }>);
  const cliente = vehiculo ? uno(vehiculo.clientes) : null;
  const esPresupuesto = orden.estado === "presupuestado";
  const numero = orden.id.slice(0, 8).toUpperCase();

  const pdf = await generarPdfPresupuesto({
    titulo: esPresupuesto ? "Presupuesto" : "Orden de trabajo",
    numero,
    fecha: orden.fecha,
    // La validez corre desde el día en que se genera el PDF (lo que recibe el cliente), no desde la fecha de la orden.
    validoHasta: esPresupuesto ? sumarDias(hoyArgentina(), DIAS_VALIDEZ) : null,
    taller: { nombre: taller?.nombre ?? "Taller", telefono: datosTaller?.telefono ?? null },
    cliente,
    vehiculo: vehiculo ? { patente: vehiculo.patente, marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio } : null,
    kmIngreso: orden.km_ingreso,
    tipoTrabajo: orden.tipo_trabajo,
    descripcion: orden.descripcion,
    items: (orden.items_orden ?? []).map((i: { codigo: string | null; descripcion: string; tipo: string; cantidad: number | string; precio_unitario: number | string }) => ({
      codigo: i.codigo,
      descripcion: i.descripcion,
      tipo: i.tipo,
      cantidad: Number(i.cantidad),
      precio: Number(i.precio_unitario),
    })),
    total: Number(orden.total ?? 0),
    proximoService: { fecha: orden.proximo_service_fecha, km: orden.proximo_service_km },
  });

  const nombre = `${esPresupuesto ? "presupuesto" : "orden"}-${vehiculo?.patente ?? numero}-${orden.fecha}.pdf`;
  // ?ver=1 lo abre en el navegador en vez de descargarlo.
  const disposicion = request.nextUrl.searchParams.get("ver") === "1" ? "inline" : "attachment";

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposicion}; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
