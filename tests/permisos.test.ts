// Tests de qué puede hacer cada rol en la interfaz (lib/permisos.ts).
// La seguridad real está en la base: ver supabase/tests/aislamiento_y_roles.sql.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { puede, type Permiso, type Rol } from "../lib/permisos.ts";

const esperado: Record<Permiso, Rol[]> = {
  editarClientes: ["dueno", "recepcion"],
  editarOrdenes: ["dueno", "recepcion", "mecanico"],
  contactarClientes: ["dueno", "recepcion"],
  crearNotas: ["dueno", "recepcion", "mecanico"],
  cobrar: ["dueno", "recepcion"],
  borrar: ["dueno"],
  verFacturacion: ["dueno"],
  listaPrecios: ["dueno"],
  ajustes: ["dueno"],
  equipo: ["dueno"],
};

for (const [permiso, roles] of Object.entries(esperado) as [Permiso, Rol[]][]) {
  for (const rol of ["dueno", "recepcion", "mecanico"] as Rol[]) {
    test(`${rol} ${roles.includes(rol) ? "puede" : "NO puede"} ${permiso}`, () => {
      assert.equal(puede(rol, permiso), roles.includes(rol));
    });
  }
}
