"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { decimal, texto, type EstadoForm } from "@/lib/formularios";
import { leerListaPrecios, leerPrecio, type FilaPrecio } from "@/lib/lista-precios";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type PrecioActual = { id: string; codigo: string; descripcion: string; tipo: string; precio: number | string; activo: boolean };

export type Cambio = { codigo: string; descripcion: string; antes: number | null; despues: number };

export type ResultadoCarga = {
  error?: string;
  modo?: "vista_previa" | "aplicado";
  archivo?: string;
  columnas?: { codigo: string | null; descripcion: string; tipo: string | null; precio: string };
  nuevos?: number;
  actualizados?: number;
  sinCambios?: number;
  /** Ítems activos de la lista que no vienen en el archivo. */
  faltantes?: number;
  desactivados?: number;
  /** Muestra de cambios para revisar (hasta 30). */
  muestra?: Cambio[];
  avisos?: string[];
  /** Suba promedio (%) de los ítems que cambiaron de precio. */
  variacionPromedio?: number | null;
};

const PAGINA = 1000;
const LOTE = 500;

async function listaActual(supabase: Supabase, tallerId: string) {
  const todos: PrecioActual[] = [];
  for (let desde = 0; ; desde += PAGINA) {
    const { data, error } = await supabase
      .from("precios")
      .select("id, codigo, descripcion, tipo, precio, activo")
      .eq("taller_id", tallerId)
      .order("codigo")
      .range(desde, desde + PAGINA - 1);
    if (error) throw error;
    todos.push(...(data ?? []));
    if (!data || data.length < PAGINA) return todos;
  }
}

/** Compara el archivo con la lista actual: qué es nuevo, qué cambia y qué falta. */
function comparar(filas: FilaPrecio[], actual: PrecioActual[]) {
  const porCodigo = new Map(actual.map((p) => [p.codigo, p]));
  const enArchivo = new Set(filas.map((f) => f.codigo));
  const nuevos: FilaPrecio[] = [];
  const actualizados: { fila: FilaPrecio; antes: PrecioActual }[] = [];
  let sinCambios = 0;

  for (const f of filas) {
    const p = porCodigo.get(f.codigo);
    if (!p) nuevos.push(f);
    else if (Number(p.precio) !== f.precio || p.descripcion !== f.descripcion || p.tipo !== f.tipo || !p.activo)
      actualizados.push({ fila: f, antes: p });
    else sinCambios++;
  }
  const faltantes = actual.filter((p) => p.activo && !enArchivo.has(p.codigo));

  const conCambioDePrecio = actualizados.filter((a) => Number(a.antes.precio) > 0 && Number(a.antes.precio) !== a.fila.precio);
  const variacionPromedio = conCambioDePrecio.length
    ? Math.round(
        (conCambioDePrecio.reduce((s, a) => s + (a.fila.precio / Number(a.antes.precio) - 1), 0) / conCambioDePrecio.length) * 1000,
      ) / 10
    : null;

  const muestra: Cambio[] = [
    ...actualizados
      .filter((a) => Number(a.antes.precio) !== a.fila.precio)
      .map((a) => ({ codigo: a.fila.codigo, descripcion: a.fila.descripcion, antes: Number(a.antes.precio), despues: a.fila.precio })),
    ...nuevos.map((f) => ({ codigo: f.codigo, descripcion: f.descripcion, antes: null, despues: f.precio })),
  ].slice(0, 30);

  return { nuevos, actualizados, sinCambios, faltantes, muestra, variacionPromedio };
}

/**
 * Sube una lista de precios (Excel o CSV).
 * modo "vista_previa": solo muestra qué cambiaría. modo "aplicar": guarda.
 */
export async function procesarLista(_prev: ResultadoCarga, formData: FormData): Promise<ResultadoCarga> {
  const { tallerId, userId, sinPermiso } = await sesionCon("listaPrecios");
  if (sinPermiso) return { error: SIN_PERMISO };

  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Elegí un archivo .xlsx o .csv." };
  const modo = texto(formData, "modo") === "aplicar" ? "aplicar" : "vista_previa";
  const tipoPorDefecto = texto(formData, "tipo_defecto") === "mano_de_obra" ? "mano_de_obra" : "repuesto";
  const desactivarFaltantes = formData.get("desactivar_faltantes") === "on";

  const lectura = await leerListaPrecios(archivo.name, Buffer.from(await archivo.arrayBuffer()), tipoPorDefecto);
  if ("error" in lectura) return { error: lectura.error };
  if (lectura.filas.length === 0) return { error: "El archivo no tiene ningún precio válido.", avisos: lectura.avisos.slice(0, 50) };

  const supabase = await createClient();
  let actual: PrecioActual[];
  try {
    actual = await listaActual(supabase, tallerId);
  } catch (e) {
    return { error: traducirErrorDb(e as never) };
  }

  const c = comparar(lectura.filas, actual);
  const resumen: ResultadoCarga = {
    archivo: archivo.name,
    columnas: lectura.columnas,
    nuevos: c.nuevos.length,
    actualizados: c.actualizados.length,
    sinCambios: c.sinCambios,
    faltantes: c.faltantes.length,
    muestra: c.muestra,
    avisos: lectura.avisos.slice(0, 50),
    variacionPromedio: c.variacionPromedio,
  };

  if (modo === "vista_previa") return { ...resumen, modo: "vista_previa" };

  // Guardar: solo lo nuevo y lo que cambió (lo igual no se toca, así no ensucia el historial).
  const aGuardar = [...c.nuevos, ...c.actualizados.map((a) => a.fila)].map((f) => ({
    taller_id: tallerId,
    codigo: f.codigo,
    descripcion: f.descripcion,
    tipo: f.tipo,
    precio: f.precio,
    activo: true,
  }));
  for (let i = 0; i < aGuardar.length; i += LOTE) {
    const { error } = await supabase.from("precios").upsert(aGuardar.slice(i, i + LOTE), { onConflict: "taller_id,codigo" });
    if (error) return { ...resumen, error: `Se guardaron ${i} de ${aGuardar.length} ítems y después falló: ${traducirErrorDb(error)}` };
  }

  let desactivados = 0;
  if (desactivarFaltantes && c.faltantes.length) {
    const ids = c.faltantes.map((p) => p.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { error } = await supabase.from("precios").update({ activo: false }).in("id", ids.slice(i, i + 200)).eq("taller_id", tallerId);
      if (error) return { ...resumen, error: traducirErrorDb(error) };
    }
    desactivados = ids.length;
  }

  await supabase.from("precios_cargas").insert({
    taller_id: tallerId,
    archivo: archivo.name.slice(0, 255),
    nuevos: c.nuevos.length,
    actualizados: c.actualizados.length,
    sin_cambios: c.sinCambios,
    desactivados,
    creado_por: userId,
  });

  revalidatePath("/precios");
  return { ...resumen, desactivados, modo: "aplicado" };
}

/** Alta o edición manual de un ítem. id null = nuevo. */
export async function guardarPrecio(id: string | null, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("listaPrecios");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = {
    codigo: texto(formData, "codigo").slice(0, 60),
    descripcion: texto(formData, "descripcion").replace(/\s+/g, " "),
    tipo: texto(formData, "tipo"),
    precio: texto(formData, "precio"),
  };
  if (!valores.codigo) return { error: "Poné un código (ej: FIL-01).", valores };
  if (!valores.descripcion) return { error: "Poné una descripción.", valores };
  if (valores.descripcion.length > 300) return { error: "La descripción es demasiado larga.", valores };
  if (!["repuesto", "mano_de_obra"].includes(valores.tipo)) return { error: "Elegí el tipo.", valores };
  const precio = leerPrecio(valores.precio);
  if (precio === null) return { error: "El precio tiene que ser un número (ej: 15000 o 15.000,50).", valores };

  const datos: Record<string, unknown> = { codigo: valores.codigo, descripcion: valores.descripcion, tipo: valores.tipo, precio };
  // Stock (solo si el formulario lo mostró: sin la migración 20261012 no existen las columnas).
  if (formData.has("stock")) {
    const stockTexto = texto(formData, "stock");
    const minimoTexto = texto(formData, "stock_minimo");
    Object.assign(valores, { stock: stockTexto, stock_minimo: minimoTexto });
    const stock = decimal(stockTexto);
    const minimo = decimal(minimoTexto);
    if (Number.isNaN(stock) || Number.isNaN(minimo)) return { error: "El stock tiene que ser un número (ej: 4 o 2,5).", valores };
    if (minimo !== null && stock === null) return { error: "Para avisar con stock bajo, cargá también el stock actual.", valores };
    datos.stock = stock;
    datos.stock_minimo = minimo;
  }

  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("precios").update(datos).eq("id", id).eq("taller_id", tallerId)
    : await supabase.from("precios").insert({ ...datos, taller_id: tallerId });

  if (error) {
    return { error: traducirErrorDb(error, { duplicado: `Ya hay un ítem con el código ${valores.codigo}.` }), valores };
  }

  revalidatePath("/precios");
  return { exito: id ? "Precio actualizado." : "Ítem agregado." };
}

/** Activar o desactivar un ítem (desactivado = no aparece al armar presupuestos). */
export async function cambiarActivoPrecio(id: string, activo: boolean): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("listaPrecios");
  if (sinPermiso) return { error: SIN_PERMISO };
  const supabase = await createClient();
  const { error } = await supabase.from("precios").update({ activo }).eq("id", id).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };
  revalidatePath("/precios");
  return {};
}
