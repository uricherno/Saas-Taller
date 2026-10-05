// Texto del recordatorio de WhatsApp. Sin imports de servidor: lo usa también
// la vista previa de /ajustes en el navegador.

export const PLANTILLA_POR_DEFECTO =
  "Hola {nombre}, te escribimos de {taller}. Tu {marca} {modelo} ({patente}) ya está para su próximo service. ¿Querés que te agendemos un turno?";

export const VARIABLES = [
  { clave: "{nombre}", descripcion: "Nombre del cliente" },
  { clave: "{taller}", descripcion: "Nombre de tu taller" },
  { clave: "{marca}", descripcion: "Marca del vehículo" },
  { clave: "{modelo}", descripcion: "Modelo del vehículo" },
  { clave: "{patente}", descripcion: "Patente" },
] as const;

export const MAX_LARGO_PLANTILLA = 1000;

export type DatosPlantilla = {
  nombre: string;
  taller: string;
  marca: string | null;
  modelo: string | null;
  patente: string;
};

/** Reemplaza las variables {nombre}, {taller}, {marca}, {modelo} y {patente}. */
export function aplicarPlantilla(plantilla: string | null | undefined, d: DatosPlantilla): string {
  const texto = plantilla?.trim() || PLANTILLA_POR_DEFECTO;
  // Si no hay marca ni modelo, "Tu {marca} {modelo}" queda como "Tu vehículo".
  const sinAuto = !d.marca && !d.modelo;
  const valores: Record<string, string> = {
    nombre: d.nombre,
    taller: d.taller,
    marca: sinAuto ? "vehículo" : (d.marca ?? ""),
    modelo: d.modelo ?? "",
    patente: d.patente,
  };
  return texto
    .replace(/\{(nombre|taller|marca|modelo|patente)\}/gi, (_, v: string) => valores[v.toLowerCase()])
    .replace(/[ \t]{2,}/g, " ") // espacios dobles si faltaba algún dato
    .replace(/ +([,.)])/g, "$1")
    .trim();
}
