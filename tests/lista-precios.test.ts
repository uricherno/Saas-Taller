// La lista de precios de ejemplo se lee bien desde Excel.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { leerListaPrecios } from "../lib/lista-precios.ts";

test("lee el Excel de ejemplo", async () => {
  const r = await leerListaPrecios("lista.xlsx", fs.readFileSync("ejemplos/lista-de-precios-ejemplo.xlsx"));
  assert.ok(!("error" in r), JSON.stringify(r));
  assert.equal(r.filas.length, 12);
});
