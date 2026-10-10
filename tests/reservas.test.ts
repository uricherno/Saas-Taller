// Tests de los horarios libres de la página de turnos online.
import { test } from "node:test";
import assert from "node:assert/strict";
import { horariosLibres, leerHorario, validarHorario } from "../lib/reservas.ts";

const horario = { dias: [1, 2, 3, 4, 5], desde: "08:00", hasta: "11:00", duracion: 60 };

test("arma la grilla solo en los días de atención", () => {
  // Jueves 8/10/2026 a las 7:00 hora argentina (10:00 UTC).
  const dias = horariosLibres(horario, [], "2026-10-08", new Date("2026-10-08T10:00:00Z"), 4);
  assert.deepEqual(dias.map((d) => d.fecha), ["2026-10-08", "2026-10-09"]); // sábado y domingo no
  assert.deepEqual(dias[0].horas.map((h) => h.hora), ["08:00", "09:00", "10:00"]);
  assert.equal(dias[0].horas[0].inicio, "2026-10-08T08:00:00-03:00");
});

test("saca los horarios ocupados y los de menos de 1 hora", () => {
  const ahora = new Date("2026-10-08T11:30:00Z"); // 8:30 en Argentina
  const ocupados = ["2026-10-08T13:00:00Z"]; // 10:00 en Argentina
  const [hoy] = horariosLibres(horario, ocupados, "2026-10-08", ahora, 1);
  // 9:00 está a 30 minutos y 10:00 está ocupado: no queda nada hoy.
  assert.equal(hoy, undefined);
});

test("leerHorario y validarHorario", () => {
  assert.deepEqual(leerHorario(null).dias, []);
  assert.equal(leerHorario({ dias: [1], desde: "9", hasta: "x", duracion: 5 }).duracion, 60);
  assert.equal(validarHorario({ ...horario, dias: [] }), "Elegí al menos un día de atención.");
  assert.equal(validarHorario({ ...horario, hasta: "08:30" }) !== null, true);
  assert.equal(validarHorario(horario), null);
});
