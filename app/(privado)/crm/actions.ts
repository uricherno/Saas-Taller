"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sesionCon } from "@/lib/sesion";
import { puede, SIN_PERMISO } from "@/lib/permisos";
import { traducirErrorDb } from "@/lib/db-errores";
import { texto, type EstadoForm } from "@/lib/formularios";
import { esTipoInteraccion } from "@/lib/crm";

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

// Las acciones del CRM tocan varias pantallas a la vez (ficha, inicio, listas):
// se refresca todo el árbol privado.
const refrescar = () => revalidatePath("/", "layout");

// ─── WhatsApp ─────────────────────────────────────────────────────────────

/**
 * Registra en la línea de tiempo del cliente que se le escribió por WhatsApp.
 * La llaman todos los botones de WhatsApp después de abrir wa.me.
 */
export async function registrarWhatsapp(datos: {
  clienteId: string;
  vehiculoId?: string | null;
  texto: string;
}): Promise<{ error?: string }> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase.from("interacciones").insert({
    taller_id: tallerId,
    cliente_id: datos.clienteId,
    vehiculo_id: datos.vehiculoId ?? null,
    tipo: "whatsapp",
    texto: datos.texto.trim().slice(0, 4000) || "Se abrió una conversación de WhatsApp.",
  });
  if (error) return { error: "Se abrió WhatsApp, pero no se pudo registrar en la ficha del cliente." };

  refrescar();
  return {};
}

// ─── Interacciones (nota rápida, llamada, etc.) ──────────────────────────

export async function agregarInteraccion(
  contexto: { clienteId: string; vehiculoId?: string | null },
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId, rol, sinPermiso } = await sesionCon("crearNotas");
  if (sinPermiso) return { error: SIN_PERMISO };

  const tipo = texto(formData, "tipo") || "nota";
  const contenido = texto(formData, "texto");
  const valores = { tipo, texto: contenido };

  if (!esTipoInteraccion(tipo)) return { error: "Elegí el tipo de registro.", valores };
  if (tipo !== "nota" && !puede(rol, "contactarClientes")) {
    return { error: "Con tu rol solo podés agregar notas.", valores };
  }
  if (!contenido) return { error: "Escribí algo antes de guardar.", valores };
  if (contenido.length > 4000) return { error: "El texto es demasiado largo (máximo 4000 caracteres).", valores };

  const supabase = await createClient();
  const { error } = await supabase.from("interacciones").insert({
    taller_id: tallerId,
    cliente_id: contexto.clienteId,
    vehiculo_id: contexto.vehiculoId ?? null,
    tipo,
    texto: contenido,
  });
  if (error) return { error: traducirErrorDb(error), valores };

  refrescar();
  return { exito: "Guardado.", valores: { tipo } };
}

// ─── Seguimientos ─────────────────────────────────────────────────────────

export async function crearSeguimiento(
  contexto: { clienteId: string; vehiculoId?: string | null; ordenId?: string | null },
  _prev: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = {
    titulo: texto(formData, "titulo"),
    vence_en: texto(formData, "vence_en"),
    asignado_a: texto(formData, "asignado_a"),
  };
  if (!valores.titulo) return { error: "Escribí qué hay que hacer.", valores };
  if (valores.titulo.length > 300) return { error: "El título es demasiado largo.", valores };
  if (!FECHA_RE.test(valores.vence_en)) return { error: "Elegí para cuándo es.", valores };

  const supabase = await createClient();
  const { error } = await supabase.from("seguimientos").insert({
    taller_id: tallerId,
    cliente_id: contexto.clienteId,
    vehiculo_id: contexto.vehiculoId ?? null,
    orden_id: contexto.ordenId ?? null,
    titulo: valores.titulo,
    vence_en: valores.vence_en,
    asignado_a: valores.asignado_a || null,
  });
  if (error) return { error: traducirErrorDb(error), valores };

  refrescar();
  return { exito: "Seguimiento creado." };
}

export async function marcarSeguimiento(id: string, hecha: boolean): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("seguimientos")
    .update({ hecha_en: hecha ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("taller_id", tallerId)
    .select("id");
  if (error) return { error: traducirErrorDb(error) };
  if (!data?.length) return { error: "No se encontró el seguimiento." };

  refrescar();
  return {};
}

export async function borrarSeguimiento(id: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("borrar");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase.from("seguimientos").delete().eq("id", id).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };

  refrescar();
  return {};
}

// ─── Vencimientos de vehículos ────────────────────────────────────────────

export async function crearVencimiento(vehiculoId: string, _prev: EstadoForm, formData: FormData): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return { error: SIN_PERMISO };

  const valores = { tipo: texto(formData, "tipo"), fecha: texto(formData, "fecha"), nota: texto(formData, "nota") };
  if (!["vtv", "seguro", "otro"].includes(valores.tipo)) return { error: "Elegí el tipo de vencimiento.", valores };
  if (!FECHA_RE.test(valores.fecha)) return { error: "Elegí la fecha de vencimiento.", valores };
  if (valores.tipo === "otro" && !valores.nota) return { error: "Para “Otro”, escribí en la nota qué vence.", valores };
  if (valores.nota.length > 500) return { error: "La nota es demasiado larga.", valores };

  const supabase = await createClient();
  const { error } = await supabase.from("vencimientos_vehiculo").insert({
    taller_id: tallerId,
    vehiculo_id: vehiculoId,
    tipo: valores.tipo,
    fecha: valores.fecha,
    nota: valores.nota || null,
  });
  if (error) return { error: traducirErrorDb(error), valores };

  refrescar();
  return { exito: "Vencimiento guardado." };
}

export async function borrarVencimiento(id: string): Promise<EstadoForm> {
  const { tallerId, sinPermiso } = await sesionCon("borrar");
  if (sinPermiso) return { error: SIN_PERMISO };

  const supabase = await createClient();
  const { error } = await supabase.from("vencimientos_vehiculo").delete().eq("id", id).eq("taller_id", tallerId);
  if (error) return { error: traducirErrorDb(error) };

  refrescar();
  return {};
}

/** Registra en la ficha del cliente que se le mandó el PDF del presupuesto. */
export async function registrarPresupuestoEnviado(datos: {
  clienteId: string;
  vehiculoId?: string | null;
  texto: string;
}): Promise<{ error?: string }> {
  const { tallerId, sinPermiso } = await sesionCon("contactarClientes");
  if (sinPermiso) return {}; // el mecánico puede compartir el PDF, pero no se registra
  const supabase = await createClient();
  const { error } = await supabase.from("interacciones").insert({
    taller_id: tallerId,
    cliente_id: datos.clienteId,
    vehiculo_id: datos.vehiculoId ?? null,
    tipo: "presupuesto",
    texto: datos.texto.slice(0, 4000),
  });
  if (error) return { error: "No se pudo registrar el envío en la ficha del cliente." };
  refrescar();
  return {};
}
