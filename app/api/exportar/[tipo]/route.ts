import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { puede } from "@/lib/permisos";
import { fechaCsv, generarCsv, type Celda } from "@/lib/csv";
import { hoyISO, infoEstado, labelTipoTrabajo } from "@/lib/ordenes";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Uno<T> = T | T[] | null;
const uno = <T,>(x: Uno<T>): T | null => (Array.isArray(x) ? (x[0] ?? null) : x);

const PAGINA = 1000;

/** Trae todas las filas en páginas de 1000 (el máximo que devuelve la API por consulta). */
async function todas<T>(consulta: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const filas: T[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await consulta(desde, desde + PAGINA - 1);
    if (error) throw error;
    filas.push(...(data ?? []));
    if (!data || data.length < PAGINA) return filas;
  }
}

const EXPORTACIONES: Record<
  string,
  (supabase: Supabase, tallerId: string) => Promise<{ encabezados: string[]; filas: Celda[][] }>
> = {
  async clientes(supabase, tallerId) {
    type Fila = {
      nombre: string; telefono: string | null; notas: string | null; origen: string | null;
      etiquetas: string[] | null; creado_en: string; vehiculos: { count: number }[];
    };
    const datos = await todas<Fila>((d, h) =>
      supabase
        .from("clientes")
        .select("nombre, telefono, notas, origen, etiquetas, creado_en, vehiculos(count)")
        .eq("taller_id", tallerId)
        .order("nombre")
        .range(d, h),
    );
    return {
      encabezados: ["Nombre", "Teléfono", "Origen", "Etiquetas", "Notas", "Vehículos", "Alta"],
      filas: datos.map((c) => [
        c.nombre, c.telefono, c.origen, (c.etiquetas ?? []).join(", "), c.notas,
        c.vehiculos?.[0]?.count ?? 0, fechaCsv(c.creado_en),
      ]),
    };
  },

  async vehiculos(supabase, tallerId) {
    type Fila = {
      patente: string; marca: string | null; modelo: string | null; anio: number | null;
      km_actual: number | null; creado_en: string; clientes: Uno<{ nombre: string; telefono: string | null }>;
    };
    const datos = await todas<Fila>((d, h) =>
      supabase
        .from("vehiculos")
        .select("patente, marca, modelo, anio, km_actual, creado_en, clientes(nombre, telefono)")
        .eq("taller_id", tallerId)
        .order("patente")
        .range(d, h),
    );
    return {
      encabezados: ["Patente", "Marca", "Modelo", "Año", "Kilometraje", "Cliente", "Teléfono del cliente", "Alta"],
      filas: datos.map((v) => {
        const c = uno(v.clientes);
        return [v.patente, v.marca, v.modelo, v.anio, v.km_actual, c?.nombre, c?.telefono, fechaCsv(v.creado_en)];
      }),
    };
  },

  async ordenes(supabase, tallerId) {
    type Fila = {
      fecha: string; estado: string; tipo_trabajo: string | null; km_ingreso: number | null; descripcion: string | null;
      total: number | string | null; proximo_service_fecha: string | null; proximo_service_km: number | null;
      vehiculos: Uno<{ patente: string; marca: string | null; modelo: string | null; clientes: Uno<{ nombre: string }> }>;
    };
    const datos = await todas<Fila>((d, h) =>
      supabase
        .from("ordenes_trabajo")
        .select(
          "fecha, estado, tipo_trabajo, km_ingreso, descripcion, total, proximo_service_fecha, proximo_service_km, vehiculos(patente, marca, modelo, clientes(nombre))",
        )
        .eq("taller_id", tallerId)
        .order("fecha", { ascending: false })
        .order("id")
        .range(d, h),
    );
    return {
      encabezados: [
        "Fecha", "Estado", "Tipo de trabajo", "Patente", "Vehículo", "Cliente", "Km de ingreso",
        "Descripción", "Total ($)", "Próximo service (fecha)", "Próximo service (km)",
      ],
      filas: datos.map((o) => {
        const v = uno(o.vehiculos);
        return [
          fechaCsv(o.fecha), infoEstado(o.estado).label, labelTipoTrabajo(o.tipo_trabajo), v?.patente,
          [v?.marca, v?.modelo].filter(Boolean).join(" "), uno(v?.clientes ?? null)?.nombre, o.km_ingreso,
          o.descripcion, Number(o.total ?? 0), fechaCsv(o.proximo_service_fecha), o.proximo_service_km,
        ];
      }),
    };
  },
};

// GET /api/exportar/clientes | vehiculos | ordenes → descarga un CSV con los datos del taller.
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/exportar/[tipo]">) {
  const { tipo } = await params;
  const exportar = EXPORTACIONES[tipo];
  if (!exportar) return NextResponse.json({ error: "Exportación desconocida" }, { status: 404 });

  // Sin sesión, obtenerSesion() redirige a /login.
  const { tallerId, rol } = await obtenerSesion();
  if (!puede(rol, "ajustes")) {
    return NextResponse.json({ error: "Solo el dueño del taller puede exportar datos." }, { status: 403 });
  }

  const supabase = await createClient();
  try {
    const { encabezados, filas } = await exportar(supabase, tallerId);
    return new NextResponse(generarCsv(encabezados, filas), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tipo}-${hoyISO()}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "No se pudieron exportar los datos." }, { status: 500 });
  }
}
