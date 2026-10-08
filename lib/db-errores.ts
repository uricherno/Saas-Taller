import type { PostgrestError } from "@supabase/supabase-js";

// Traduce los errores de la base (Postgres / PostgREST) a mensajes en español.
export function traducirErrorDb(
  error: PostgrestError,
  mensajes: { duplicado?: string; enUso?: string } = {},
): string {
  switch (error.code) {
    case "P0001": // raise exception de nuestros triggers: el mensaje ya está en español
      return error.message;
    case "23505": // unique_violation
      return mensajes.duplicado ?? "Ya existe un registro con esos datos.";
    case "23503": // foreign_key_violation
      return mensajes.enUso ?? "No se puede completar porque hay datos relacionados.";
    case "23502": // not_null_violation
      return "Falta completar un campo obligatorio.";
    case "23514": // check_violation
      return "Algún dato no tiene un valor permitido (por ejemplo, el estado o el tipo).";
    case "22007": // invalid_datetime_format
    case "22008": // datetime_field_overflow
      return "La fecha no es válida.";
    case "22P02": // invalid_text_representation
    case "22003": // numeric_value_out_of_range
      return "Algún dato numérico no es válido.";
    case "42703": // undefined_column
    case "PGRST204": // columna desconocida para la API
      return "Falta correr la última migración en Supabase (SQL Editor).";
    case "42501": // insufficient_privilege (RLS)
      return "No tenés permiso para hacer esta operación.";
  }
  // Error no reconocido: se muestra completo en la terminal del servidor para poder corregirlo.
  console.error("[db] Error de Supabase no reconocido:", {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
  return "Ocurrió un error al guardar. Intentá de nuevo.";
}

/** true si falta una columna, tabla o función porque la migración no se corrió todavía. */
export function faltaMigracion(error: { code?: string } | null | undefined) {
  return ["42703", "42P01", "PGRST204", "PGRST205", "PGRST202"].includes(error?.code ?? "");
}

export const MENSAJE_FALTA_MIGRACION =
  "Falta correr la última migración en Supabase (SQL Editor). Sin eso esta pantalla no puede cargar.";
