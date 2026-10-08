import type { AuthError } from "@supabase/supabase-js";

// Traduce los errores de Supabase Auth a mensajes claros en español.
export function traducirErrorAuth(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Email o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmaste tu email. Revisá tu bandeja de entrada (y la carpeta de spam).";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese email. Probá iniciar sesión.";
    case "same_password":
      return "La nueva contraseña tiene que ser distinta a la anterior.";
    case "weak_password":
      return "La contraseña es muy débil. Usá al menos 6 caracteres, combinando letras y números.";
    case "email_address_invalid":
    case "validation_failed":
      return "El email no es válido.";
    case "over_email_send_rate_limit":
      return "Se enviaron demasiados emails. Esperá unos minutos y volvé a intentar.";
    case "over_request_rate_limit":
      return "Demasiados intentos. Esperá unos minutos y volvé a intentar.";
    case "signup_disabled":
      return "El registro de nuevas cuentas está deshabilitado.";
    case "user_banned":
      return "Esta cuenta está suspendida.";
    case "email_address_not_authorized":
      // El mail de fábrica de Supabase solo envía a los miembros del equipo del proyecto: falta configurar SMTP propio.
      console.error("[auth] Supabase no puede mandar mails a esta dirección (falta SMTP propio):", detalle(error));
      return "No pudimos enviarte el email de confirmación. Intentá más tarde o escribinos.";
    case "unexpected_failure":
      if (/sending|email/i.test(error.message)) {
        console.error("[auth] Falló el envío del mail (revisar SMTP en Supabase → Authentication → Emails):", detalle(error));
        return "No pudimos enviarte el email de confirmación. Intentá más tarde o escribinos.";
      }
      // "Database error saving new user": falló el trigger handle_new_user en la base.
      // El detalle exacto está en Supabase → Logs → Postgres (ver supabase/diagnostico_registro.sql).
      if (/database error/i.test(error.message)) {
        console.error("[auth] La base rechazó el alta del usuario (trigger handle_new_user):", detalle(error));
        return "No se pudo crear la cuenta por un problema en la base de datos. Intentá de nuevo en unos minutos.";
      }
      break;
  }

  if (error.status === 0 || /fetch/i.test(error.message)) {
    return "No se pudo conectar con el servidor. Revisá tu conexión.";
  }

  // Error no reconocido: se muestra completo en la terminal del servidor para poder corregirlo.
  console.error("[auth] Error de Supabase no reconocido:", detalle(error));
  return "Ocurrió un error inesperado. Intentá de nuevo.";
}

function detalle(error: AuthError) {
  return { code: error.code, status: error.status, name: error.name, message: error.message };
}
