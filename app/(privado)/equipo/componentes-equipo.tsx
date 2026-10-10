"use client";

import { useActionState, useState, useTransition } from "react";
import type { EstadoForm } from "@/lib/formularios";
import { ROLES, labelRol } from "@/lib/permisos";
import { Alerta, BotonEnviar, Campo, Selector } from "@/components/ui";
import { borrarInvitacion, cambiarActivo, cambiarRol, crearEmpleado, invitar } from "./actions";

const OPCIONES_ROL = ROLES.map((r) => ({ valor: r.valor, label: r.label }));

function mensajeWhatsapp(taller: string, rol: string, link: string) {
  return `¡Hola! Te invito a sumarte al equipo de ${taller} como ${labelRol(rol)}. Creá tu usuario desde este enlace (vence en 7 días): ${link}`;
}

/** Botones para copiar el enlace de invitación y compartirlo por WhatsApp. */
function CompartirLink({ link, taller, rol }: { link: string; taller: string; rol: string }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-2">
      <input
        readOnly
        value={link}
        onFocus={(e) => e.target.select()}
        aria-label="Enlace de invitación"
        className="block w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopiado(true);
              setTimeout(() => setCopiado(false), 2000);
            } catch {
              // sin permiso de portapapeles: el usuario puede copiarlo del campo
            }
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          {copiado ? "¡Copiado!" : "Copiar enlace"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(mensajeWhatsapp(taller, rol, link))}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          Mandar por WhatsApp
        </a>
      </div>
    </div>
  );
}

export function FormInvitar({ taller }: { taller: string }) {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(invitar, {});
  const v = estado.valores;

  return (
    <div className="space-y-4">
      <form action={enviar} className="space-y-3" key={estado.exito ? v?.link : "form"}>
        {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_12rem]">
          <Campo
            label="Email de la persona"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            required
            defaultValue={estado.exito ? "" : v?.email}
            placeholder="nombre@email.com"
          />
          <Selector label="Rol" name="rol" opciones={OPCIONES_ROL} defaultValue={v?.rol ?? "recepcion"} />
        </div>
        <div className="sm:w-48">
          <BotonEnviar cargando={cargando}>Crear invitación</BotonEnviar>
        </div>
      </form>

      {estado.exito && v?.link && (
        <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">{estado.exito} Mandale este enlace:</p>
          <CompartirLink link={v.link} taller={taller} rol={v.rol} />
        </div>
      )}
    </div>
  );
}

/** Crear el usuario directamente con contraseña (sin mails). */
export function FormCrearEmpleado() {
  const [estado, enviar, cargando] = useActionState<EstadoForm, FormData>(crearEmpleado, {});
  const v = estado.valores;

  return (
    <form action={enviar} className="space-y-3" key={estado.exito ?? "form"}>
      {estado.error && <Alerta tipo="error">{estado.error}</Alerta>}
      {estado.exito && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900">
          <p className="font-medium">{estado.exito}</p>
          <p className="mt-1">
            Usuario: <span className="font-mono">{v?.email}</span> · Contraseña: <span className="font-mono">{v?.clave}</span>
          </p>
          <p className="mt-1 text-xs">Pasáselos por WhatsApp. Después la puede cambiar desde “Olvidé mi contraseña”.</p>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Campo label="Nombre" name="nombre" required maxLength={200} defaultValue={estado.exito ? "" : v?.nombre} />
        <Selector label="Rol" name="rol" opciones={OPCIONES_ROL} defaultValue={estado.exito ? "recepcion" : (v?.rol ?? "recepcion")} />
        <Campo
          label="Email (usuario para entrar)"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="off"
          required
          defaultValue={estado.exito ? "" : v?.email}
          placeholder="juan@mitaller.com"
        />
        <Campo label="Contraseña" name="clave" type="text" autoComplete="new-password" required minLength={8} placeholder="Mínimo 8 caracteres" />
      </div>
      <div className="sm:w-48">
        <BotonEnviar cargando={cargando}>Crear usuario</BotonEnviar>
      </div>
    </form>
  );
}

export function FilaMiembro({
  usuario,
  esYo,
}: {
  usuario: { id: string; nombre: string; email: string; rol: string; activo: boolean };
  esYo: boolean;
}) {
  const [estadoRol, enviarRol, guardandoRol] = useActionState<EstadoForm, FormData>(
    cambiarRol.bind(null, usuario.id),
    {},
  );
  const [estadoActivo, setEstadoActivo] = useState<EstadoForm>({});
  const [cambiando, startTransition] = useTransition();
  const mensaje = estadoRol.error ?? estadoActivo.error;

  return (
    <li className={`space-y-3 px-4 py-4 ${usuario.activo ? "" : "bg-slate-50"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">
            {usuario.nombre} {esYo && <span className="text-sm font-normal text-slate-500">(vos)</span>}
          </p>
          <p className="truncate text-sm text-slate-500">{usuario.email}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            {labelRol(usuario.rol)}
          </span>
          {!usuario.activo && (
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              Desactivado
            </span>
          )}
        </div>
      </div>

      {mensaje && <Alerta tipo="error">{mensaje}</Alerta>}

      {esYo ? (
        <p className="text-xs text-slate-500">No podés cambiar tu propio rol ni desactivarte.</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <form action={enviarRol} className="flex flex-1 items-end gap-2">
            <div className="flex-1">
              <Selector
                label="Rol"
                name="rol"
                opciones={OPCIONES_ROL}
                defaultValue={usuario.rol}
                key={usuario.rol}
              />
            </div>
            <button
              type="submit"
              disabled={guardandoRol}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60"
            >
              {guardandoRol ? "Guardando…" : "Guardar rol"}
            </button>
          </form>
          <button
            type="button"
            disabled={cambiando}
            onClick={() =>
              startTransition(async () => {
                setEstadoActivo(await cambiarActivo(usuario.id, !usuario.activo));
              })
            }
            className={`rounded-lg px-3 py-2.5 text-sm font-semibold disabled:opacity-60 ${
              usuario.activo
                ? "border border-red-200 text-red-600 hover:bg-red-50"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {cambiando ? "…" : usuario.activo ? "Desactivar" : "Reactivar"}
          </button>
        </div>
      )}
    </li>
  );
}

export function FilaInvitacion({
  invitacion,
  link,
  taller,
}: {
  invitacion: { id: string; email: string; rol: string; vencida: boolean; venceTexto: string };
  link: string;
  taller: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [borrando, startTransition] = useTransition();

  return (
    <li className="space-y-3 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-slate-900">{invitacion.email}</p>
          <p className="text-sm text-slate-500">
            {labelRol(invitacion.rol)} ·{" "}
            {invitacion.vencida ? <span className="text-red-600">Vencida</span> : `Vence ${invitacion.venceTexto}`}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {!invitacion.vencida && (
            <button
              type="button"
              onClick={() => setAbierto((a) => !a)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {abierto ? "Ocultar" : "Ver enlace"}
            </button>
          )}
          <button
            type="button"
            disabled={borrando}
            onClick={() =>
              startTransition(async () => {
                const r = await borrarInvitacion(invitacion.id);
                if (r.error) setError(r.error);
              })
            }
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
          >
            {borrando ? "Borrando…" : "Borrar"}
          </button>
        </div>
      </div>
      {error && <Alerta tipo="error">{error}</Alerta>}
      {abierto && <CompartirLink link={link} taller={taller} rol={invitacion.rol} />}
    </li>
  );
}
