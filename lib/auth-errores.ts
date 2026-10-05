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
  }

  if (error.status === 0 || /fetch/i.test(error.message)) {
    return "No se pudo conectar con el servidor. Revisá tu conexión.";
  }

  return "Ocurrió un error inesperado. Intentá de nuevo.";
}
