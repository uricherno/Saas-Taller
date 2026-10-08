// Tests de las fechas de la agenda de turnos.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fechaAR, horaAR, inicioTurno, lunesDe, mensajeRecordatorioTurno, sumarDias } from "../lib/turnos.ts";

test("lunesDe devuelve el lunes de la semana", () => {
  assert.equal(lunesDe("2026-10-08"), "2026-10-05"); // jueves
  assert.equal(lunesDe("2026-10-05"), "2026-10-05"); // lunes
  assert.equal(lunesDe("2026-10-11"), "2026-10-05"); // domingo
  assert.equal(lunesDe("2026-01-01"), "2025-12-29"); // cambio de año
});

test("sumarDias cruza meses y años", () => {
  assert.equal(sumarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(sumarDias("2026-12-31", 1), "2027-01-01");
  assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
});

test("inicioTurno usa la hora argentina y se lee igual", () => {
  const iso = inicioTurno("2026-10-08", "21:30");
  assert.equal(new Date(iso).toISOString(), "2026-10-09T00:30:00.000Z");
  assert.equal(fechaAR(iso), "2026-10-08");
  assert.equal(horaAR(iso), "21:30");
});

test("mensaje de recordatorio dice hoy / mañana / el día", () => {
  const base = { nombre: "Juan", taller: "Taller X", hora: "09:00", patente: "AB123CD", hoy: "2026-10-08" };
  assert.match(mensajeRecordatorioTurno({ ...base, fecha: "2026-10-08" }), /que hoy a las 09:00 tenés turno en Taller X/);
  assert.match(mensajeRecordatorioTurno({ ...base, fecha: "2026-10-09" }), /que mañana a las/);
  assert.match(mensajeRecordatorioTurno({ ...base, fecha: "2026-10-12" }), /que el lunes 12\/10 a las/);
});
