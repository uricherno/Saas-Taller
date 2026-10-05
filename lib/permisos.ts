// Qué puede hacer cada rol EN LA INTERFAZ (ocultar menús y botones, y dar
// mensajes claros). La seguridad real está en las políticas RLS de la base:
// aunque alguien se saltee la interfaz, la base no lo deja.

export const ROLES = [
  { valor: "dueno", label: "Dueño", descripcion: "Todo, incluido el equipo y los ajustes" },
  { valor: "recepcion", label: "Recepción", descripcion: "Clientes, vehículos y órdenes (no borra clientes, vehículos ni órdenes)" },
  { valor: "mecanico", label: "Mecánico", descripcion: "Ver todo y trabajar las órdenes (cargar y quitar repuestos y mano de obra)" },
] as const;

export type Rol = (typeof ROLES)[number]["valor"];

export function esRol(v: string): v is Rol {
  return ROLES.some((r) => r.valor === v);
}

export function labelRol(rol: string) {
  return ROLES.find((r) => r.valor === rol)?.label ?? rol;
}

const PERMISOS = {
  /** Crear y editar clientes y vehículos. */
  editarClientes: ["dueno", "recepcion"],
  /** Crear y editar órdenes, agregar y quitar items, y avisar recordatorios. */
  editarOrdenes: ["dueno", "recepcion", "mecanico"],
  /**
   * Mandar WhatsApp a clientes (cada envío queda registrado como interacción),
   * crear y cerrar seguimientos, cargar vencimientos y registrar llamadas.
   */
  contactarClientes: ["dueno", "recepcion"],
  /** Agregar notas a la línea de tiempo del cliente. */
  crearNotas: ["dueno", "recepcion", "mecanico"],
  /** Borrar clientes, vehículos y órdenes enteras. */
  borrar: ["dueno"],
  /** Subir y editar la lista de precios (verla y usarla pueden todos). */
  listaPrecios: ["dueno"],
  /** /ajustes del taller. */
  ajustes: ["dueno"],
  /** /equipo: usuarios, roles e invitaciones. */
  equipo: ["dueno"],
} as const satisfies Record<string, readonly Rol[]>;

export type Permiso = keyof typeof PERMISOS;

export function puede(rol: Rol, permiso: Permiso): boolean {
  return (PERMISOS[permiso] as readonly Rol[]).includes(rol);
}

export const SIN_PERMISO = "Tu rol no tiene permiso para hacer esto. Pedíselo al dueño del taller.";
