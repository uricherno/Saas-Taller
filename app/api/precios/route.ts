import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { filtrosBusquedaPrecios } from "@/lib/busqueda-precios";

export type ResultadoPrecio = { id: string; codigo: string; descripcion: string; tipo: string; precio: number };

// GET /api/precios?q=filtro → ítems activos de la lista de precios del taller del usuario.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: usuario } = await supabase.from("usuarios").select("taller_id").eq("id", userId).maybeSingle();
  if (!usuario?.taller_id) return NextResponse.json({ error: "Sin taller" }, { status: 403 });

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 60);
  const filtros = filtrosBusquedaPrecios(q);
  if (q.length < 2 || !filtros.length) return NextResponse.json({ resultados: [] });

  // Cada palabra tiene que aparecer en la descripción o el código ("filtro aceite" encuentra "Filtro de aceite").
  let consulta = supabase
    .from("precios")
    .select("id, codigo, descripcion, tipo, precio")
    .eq("taller_id", usuario.taller_id)
    .eq("activo", true)
    .order("descripcion")
    .limit(12);
  for (const filtro of filtros) consulta = consulta.or(filtro);

  const { data, error } = await consulta;
  if (error) return NextResponse.json({ error: "No se pudo buscar" }, { status: 500 });

  const resultados: ResultadoPrecio[] = (data ?? []).map((p) => ({ ...p, precio: Number(p.precio) }));
  return NextResponse.json({ resultados }, { headers: { "Cache-Control": "private, no-store" } });
}
