// Tests de la lista de trabajos y fallas frecuentes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { agregarTrabajo, normalizarBusqueda, TODAS_LAS_FALLAS } from "../lib/catalogo-fallas.ts";

test("no hay opciones repetidas", () => {
  assert.equal(new Set(TODAS_LAS_FALLAS).size, TODAS_LAS_FALLAS.length);
});

test("agregarTrabajo suma una línea por trabajo y no repite", () => {
  let d = agregarTrabajo("", "Cambio de aceite y filtro de aceite");
  assert.equal(d, "• Cambio de aceite y filtro de aceite");
  d = agregarTrabajo(d, "Cambio de bujías");
  assert.equal(d, "• Cambio de aceite y filtro de aceite\n• Cambio de bujías");
  assert.equal(agregarTrabajo(d, "Cambio de bujías"), d);
  assert.equal(agregarTrabajo("Revisar ruido\n", "Recalienta"), "Revisar ruido\n• Recalienta");
});

test("la búsqueda ignora tildes y mayúsculas", () => {
  assert.equal(normalizarBusqueda("  Bujías "), "bujias");
});
