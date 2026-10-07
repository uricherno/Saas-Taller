// Tests de la limpieza de teléfonos para WhatsApp.
// Correr con: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { linkWhatsapp, normalizarTelefono } from "../lib/whatsapp.ts";

const casos: [entrada: string | null | undefined, esperado: string | null][] = [
  // Celulares de Buenos Aires escritos de distintas formas.
  ["11 2345-6789", "5491123456789"],
  ["1123456789", "5491123456789"],
  ["(11) 2345-6789", "5491123456789"],
  ["011 15 2345-6789", "5491123456789"],
  ["011-15-2345-6789", "5491123456789"],
  ["15 2345-6789", null], // falta el código de área
  ["+54 9 11 2345-6789", "5491123456789"],
  ["+54 11 2345 6789", "5491123456789"], // agrega el 9
  ["54 9 11 2345 6789", "5491123456789"],
  ["0054 9 11 2345 6789", "5491123456789"],

  // Interior (áreas de 3 y 4 dígitos).
  ["0351 15 123-4567", "5493511234567"],
  ["351 123-4567", "5493511234567"],
  ["+54 9 351 123-4567", "5493511234567"],
  ["02944 15 12-3456", "5492944123456"],

  // Otros países: se respetan.
  ["+598 94 123 456", "59894123456"],
  ["+1 305 555 0123", "13055550123"],

  // Inválidos.
  ["1234", null],
  ["", null],
  ["   ", null],
  [null, null],
  [undefined, null],
  ["sin número", null],
];

for (const [entrada, esperado] of casos) {
  test(`normalizarTelefono(${JSON.stringify(entrada)}) → ${esperado}`, () => {
    assert.equal(normalizarTelefono(entrada), esperado);
  });
}

test("linkWhatsapp arma el link con el mensaje codificado", () => {
  assert.equal(
    linkWhatsapp("11 2345-6789", "Hola Juan, ¿cómo andás?\nTotal: $ 1.000"),
    "https://wa.me/5491123456789?text=Hola%20Juan%2C%20%C2%BFc%C3%B3mo%20and%C3%A1s%3F%0ATotal%3A%20%24%201.000",
  );
});

test("linkWhatsapp sin mensaje", () => {
  assert.equal(linkWhatsapp("11 2345-6789"), "https://wa.me/5491123456789");
});

test("linkWhatsapp con teléfono inválido devuelve null", () => {
  assert.equal(linkWhatsapp("1234", "Hola"), null);
});