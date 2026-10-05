"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { decimal, entero, texto, type EstadoForm } from "@/lib/formularios";
import { esEstado, esTipoItem, esTipoTrabajo, type Estado } from "@/lib/ordenes";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// ─── Orden ──────────────────────────────────────────────────────────────

function leerOrden(formData: FormData) {
  return {
    fecha: texto(formData, "fecha"),
    tipo_trabajo: texto(formData, "tipo_trabajo"),
    km_ingreso: texto(formData, "km_ingreso"),
    descripcion: texto(formData, "descripcion"),
    estado: texto(formData, "estado"),
    proximo_service_fecha: texto(formData, "proximo_service_fecha"),
    proximo_service_km: texto(formData, "proximo_service_km"),
  };
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function validarOrden(v: ReturnType<typeof leerOrden>) {
  if (!FECHA_RE.test(v.fecha)) return { error: "Elegí la fecha de la orden." };
  if (!esEstado(v.estado)) return { error: "Elegí un estado válido." };
  if (!esTipoTrabajo(v.tipo_trabajo)) return { error: "Elegí el tipo de trabajo." };

  const km = entero(v.km_ingreso);
  if (km !== null && (Number.isNaN(km) || km > 3_000_000)) {
    return { error: "El kilometraje de ingreso tiene que ser un número entero." };
  }

  if (v.proximo_service_fecha && !FECHA_RE.test(v.proximo_service_fecha)) {
    return { error: "La fecha del próximo service no es válida." };
  }
  if (v.proximo_service_fecha && v.proximo_service_fecha < v.fecha) {
    return { error: "La fecha del próximo service no puede ser anterior a la fecha de la orden." };
  }

  const kmProx = entero(v.proximo_service_km);
  if (kmProx !== null && (Number.isNaN(kmProx) || kmProx > 3_000_000)) {
    return { error: "El kilometraje del próximo service tiene que ser un número entero." };
  }
  if (kmProx !== null && km !== null && kmProx <= km) {
    return { error: "El kilometraje del próximo service tiene que ser mayor al de ingreso." };
  }

  return {
    datos: {
      fecha: v.fecha,
      tipo_trabajo: v.tipo_trabajo,
      km_ingreso: km,
      descripcion: v.descripcion || null,
      estado: v.estado as Estado,
      proximo_service_fecha: v.proximo_service_fecha || null,
      proximo_service_km: kmProx,
    },
  };
}

// El km_actual del vehículo lo actualiza la base (trigger ordenes_actualizar_km)
// al guardar una orden terminada o entregada: el mecánico no puede editar vehículos.

export async function crearOrden(
  vehiculoId: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("editarOrdenes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const valores = leerOrden(formData);
  const { error, datos } = validarOrden(valores);
  if (error || !datos) return { error, valores };

  const supabase = await createClient();

  const { data: vehiculo } = await supabase
    .from("vehiculos")
    .select("id")
    .eq("id", vehiculoId)
    .eq("taller_id", tallerId)
    .maybeSingle();
  if (!vehiculo) return { error: "No se encontró el vehículo.", valores };

  const { data, error: dbError } = await supabase
    .from("ordenes_trabajo")
    .insert({ ...datos, total: 0, taller_id: tallerId, vehiculo_id: vehiculoId })
    .select("id")
    .single();

  if (dbError) return { error: traducirErrorDb(dbError), valores };

  // Ir al detalle para cargar los repuestos y la mano de obra.
  redirect(`/ordenes/${data.id}`);
}

export async function actualizarOrden(
  id: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("editarOrdenes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const valores = leerOrden(formData);
  const { error, datos } = validarOrden(valores);
  if (error || !datos) return { error, valores };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("ordenes_trabajo")
    .update(datos)
    .eq("id", id)
    .eq("taller_id", tallerId)
    .select("id");

  if (dbError) return { error: traducirErrorDb(dbError), valores };
  if (!data?.length) return { error: "No se encontró la orden.", valores };

  redirect(`/ordenes/${id}`);
}

export async function eliminarOrden(id: string, vehiculoId: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("borrar");
  if (sinPermiso) return { error: SIN_PERMISO };
  const supabase = await createClient();

  // Primero los items, por si la base no los borra en cascada.
  const { error: errorItems } = await supabase.from("items_orden").delete().eq("orden_id", id).eq("taller_id", tallerId);
  if (errorItems) return { error: traducirErrorDb(errorItems) };

  const { data, error } = await supabase.from("ordenes_trabajo").delete().eq("id", id).eq("taller_id", tallerId).select("id");
  if (error) return { error: traducirErrorDb(error) };
  if (!data?.length) return { error: "No se pudo eliminar la orden." };

  redirect(vehiculoId ? `/vehiculos/${vehiculoId}` : "/ordenes");
}

// ─── Items ──────────────────────────────────────────────────────────────

/** Recalcula el total (suma de cantidad × precio unitario) y lo guarda en la orden. */
async function recalcularTotal(supabase: Supabase, ordenId: string) {
  const { data: items, error } = await supabase
    .from("items_orden")
    .select("cantidad, precio_unitario")
    .eq("orden_id", ordenId);

  if (error) return error;

  // Sumar en centavos para evitar errores de redondeo de punto flotante.
  const centavos = (items ?? []).reduce(
    (acc, i) => acc + Math.round(Number(i.cantidad) * Number(i.precio_unitario) * 100),
    0,
  );

  const { error: errorUpdate } = await supabase
    .from("ordenes_trabajo")
    .update({ total: centavos / 100 })
    .eq("id", ordenId);

  return errorUpdate;
}

export async function agregarItem(
  ordenId: string,
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("editarOrdenes");
  if (sinPermiso) return { error: SIN_PERMISO };
  const valores = {
    tipo: texto(formData, "tipo"),
    descripcion: texto(formData, "descripcion"),
    cantidad: texto(formData, "cantidad"),
    precio_unitario: texto(formData, "precio_unitario"),
  };

  if (!esTipoItem(valores.tipo)) return { error: "Elegí si es repuesto o mano de obra.", valores };
  if (!valores.descripcion) return { error: "Escribí una descripción.", valores };

  const cantidad = decimal(valores.cantidad);
  if (cantidad === null || Number.isNaN(cantidad) || cantidad <= 0) {
    return { error: "La cantidad tiene que ser un número mayor a 0.", valores };
  }
  const precio = decimal(valores.precio_unitario);
  if (precio === null || Number.isNaN(precio)) {
    return { error: "El precio unitario tiene que ser un número (ej: 15000 o 15.000,50).", valores };
  }

  const supabase = await createClient();

  const { data: orden } = await supabase.from("ordenes_trabajo").select("id").eq("id", ordenId).maybeSingle();
  if (!orden) return { error: "No se encontró la orden.", valores };

  const { error } = await supabase.from("items_orden").insert({
    taller_id: tallerId,
    orden_id: ordenId,
    tipo: valores.tipo,
    descripcion: valores.descripcion,
    cantidad,
    precio_unitario: precio,
  });
  if (error) return { error: traducirErrorDb(error), valores };

  const errorTotal = await recalcularTotal(supabase, ordenId);
  if (errorTotal) return { error: "El item se agregó, pero no se pudo actualizar el total. Recargá la página." };

  revalidatePath(`/ordenes/${ordenId}`);
  // Formulario vacío, listo para cargar la próxima línea (conserva el tipo).
  return { exito: "Item agregado.", valores: { tipo: valores.tipo, cantidad: "1" } };
}

export async function quitarItem(itemId: string, ordenId: string): Promise<void> {
  const { tallerId, sinPermiso } = await sesionCon("editarOrdenes");
  if (sinPermiso) return;
  const supabase = await createClient();
  await supabase.from("items_orden").delete().eq("id", itemId).eq("taller_id", tallerId);
  await recalcularTotal(supabase, ordenId);
  revalidatePath(`/ordenes/${ordenId}`);
}
