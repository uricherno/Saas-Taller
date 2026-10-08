"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { formatoFecha, formatoPesos } from "@/lib/ordenes";
import { CONCEPTOS_PAGO, labelConcepto, labelMedioPago, MEDIOS_PAGO, sumarMontos } from "@/lib/cobros";
import { borrarPago, registrarPago } from "@/app/(privado)/ordenes/cobros-actions";
import { Alerta, BotonEnviar, Campo, Selector } from "@/components/ui";

export type Pago = {
  id: string;
  fecha: string;
  monto: number | string;
  concepto: string;
  medio: string;
  nota: string | null;
};

function FilaPago({ pago, ordenId, puedeBorrar }: { pago: Pago; ordenId: string; puedeBorrar: boolean }) {
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, startTransition] = useTransition();
  return (
    <li className="py-2 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-slate-900">
            {labelConcepto(pago.concepto)} · {labelMedioPago(pago.medio)}
          </p>
          <p className="text-xs text-slate-500">
            {formatoFecha(pago.fecha)}
            {pago.nota && ` · ${pago.nota}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-semibold text-slate-900">{formatoPesos(pago.monto)}</span>
          {puedeBorrar && !confirmando && (
            <button
              type="button"
              onClick={() => setConfirmando(true)}
              aria-label="Borrar cobro"
              title="Borrar"
              className="rounded-md px-2 py-1 text-lg leading-none text-slate-400 hover:bg-red-50 hover:text-red-600"
            >
              ×
            </button>
          )}
        </div>
      </div>
      {confirmando && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-red-700">¿Borrar este cobro?</span>
          <button
            type="button"
            disabled={borrando}
            onClick={() =>
              startTransition(async () => {
                const r = await borrarPago(pago.id, ordenId);
                if (r.error) setError(r.error);
                setConfirmando(false);
              })
            }
            className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            Sí, borrar
          </button>
          <button type="button" onClick={() => setConfirmando(false)} className="font-medium text-slate-600 underline">
            No
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </li>
  );
}

/** Cobros de la orden: seña, pagos parciales y saldo pendiente. */
export default function CobrosOrden({
  ordenId,
  total,
  pagos,
  puedeCobrar,
  puedeBorrar,
  hoy,
  estado,
}: {
  ordenId: string;
  total: number | string | null;
  pagos: Pago[];
  puedeCobrar: boolean;
  puedeBorrar: boolean;
  hoy: string;
  estado: string;
}) {
  const [estadoForm, enviar, cargando] = useActionState<EstadoForm, FormData>(registrarPago.bind(null, ordenId), {});
  const cobrado = sumarMontos(pagos.map((p) => p.monto));
  const saldo = Math.round((sumarMontos([total]) - cobrado) * 100) / 100;
  const v = estadoForm.valores ?? {};
  const conceptoInicial = v.concepto ?? (estado === "presupuestado" && pagos.length === 0 ? "sena" : "pago");

  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold text-slate-900">Cobros</h2>
        <p className={`text-sm font-semibold ${saldo > 0 ? "text-amber-700" : saldo < 0 ? "text-blue-700" : "text-green-700"}`}>
          {saldo > 0 ? `Saldo pendiente: ${formatoPesos(saldo)}` : saldo < 0 ? `Saldo a favor del cliente: ${formatoPesos(-saldo)}` : "Pagada"}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">Total</dt>
          <dd className="font-semibold text-slate-900">{formatoPesos(total)}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">Cobrado</dt>
          <dd className="font-semibold text-slate-900">{formatoPesos(cobrado)}</dd>
        </div>
        <div className="rounded-lg bg-slate-50 p-2">
          <dt className="text-xs text-slate-500">Saldo</dt>
          <dd className="font-semibold text-slate-900">{formatoPesos(Math.max(saldo, 0))}</dd>
        </div>
      </dl>

      {pagos.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {pagos.map((p) => (
            <FilaPago key={p.id} pago={p} ordenId={ordenId} puedeBorrar={puedeBorrar} />
          ))}
        </ul>
      )}

      {puedeCobrar && (
        <form action={enviar} className="space-y-3 border-t border-slate-200 pt-3" key={JSON.stringify(estadoForm)}>
          {estadoForm.error && <Alerta tipo="error">{estadoForm.error}</Alerta>}
          {estadoForm.exito && <Alerta tipo="exito">{estadoForm.exito}</Alerta>}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Selector label="Concepto" name="concepto" opciones={CONCEPTOS_PAGO} defaultValue={conceptoInicial} />
            <Campo
              label="Monto ($)"
              name="monto"
              inputMode="decimal"
              required
              defaultValue={estadoForm.error ? v.monto : saldo > 0 && conceptoInicial === "pago" ? String(saldo).replace(".", ",") : ""}
              placeholder="Ej: 15000"
            />
            <Selector label="Medio de pago" name="medio" opciones={MEDIOS_PAGO} defaultValue={v.medio ?? "efectivo"} />
            <Campo label="Fecha" name="fecha" type="date" required defaultValue={v.fecha ?? hoy} max={hoy} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem] sm:items-end">
            <Campo label="Nota" opcional name="nota" maxLength={300} defaultValue={estadoForm.error ? v.nota : ""} placeholder="Ej: N° de operación" />
            <BotonEnviar cargando={cargando}>Registrar cobro</BotonEnviar>
          </div>
        </form>
      )}
    </section>
  );
}
