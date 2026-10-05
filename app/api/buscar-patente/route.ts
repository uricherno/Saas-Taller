import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { terminoBusquedaPatente } from "@/lib/patentes";

export type ResultadoPatente = {
  id: string;
  patente: string;
  auto: string;
  cliente: string;
};

// GET /api/buscar-patente?q=ab12 → vehículos del taller del usuario cuya patente contiene "AB12".
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "Sin sesión" }, { status: 401 });

  const { data: usuario } = await supabase.from("usuarios").select("taller_id").eq("id", userId).maybeSingle();
  if (!usuario?.taller_id) return NextResponse.json({ error: "Sin taller" }, { status: 403 });

  const termino = terminoBusquedaPatente(request.nextUrl.searchParams.get("q") ?? "");
  if (termino.length < 2) return NextResponse.json({ resultados: [] });

  const { data, error } = await supabase
    .from("vehiculos")
    .select("id, patente, marca, modelo, clientes(nombre)")
    .eq("taller_id", usuario.taller_id)
    .ilike("patente", `%${termino}%`)
    .order("patente")
    .limit(8);

  if (error) return NextResponse.json({ error: "No se pudo buscar" }, { status: 500 });

  const resultados: ResultadoPatente[] = (data ?? []).map((v) => {
    const c = Array.isArray(v.clientes) ? v.clientes[0] : v.clientes;
    return {
      id: v.id,
      patente: v.patente,
      auto: [v.marca, v.modelo].filter(Boolean).join(" "),
      cliente: c?.nombre ?? "",
    };
  });

  return NextResponse.json({ resultados }, { headers: { "Cache-Control": "private, no-store" } });
}
