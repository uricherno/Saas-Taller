import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { obtenerSesion } from "@/lib/sesion";
import { faltaMigracion, MENSAJE_FALTA_MIGRACION } from "@/lib/db-errores";
import { puede, ROLES } from "@/lib/permisos";
import { linkInvitacion, origenActual } from "@/lib/origen";
import SinPermiso from "@/components/sin-permiso";
import { Tarjeta } from "@/components/ui";
import { FilaInvitacion, FilaMiembro, FormCrearEmpleado, FormInvitar } from "./componentes-equipo";

export const metadata: Metadata = { title: "Equipo" };

const fechaCorta = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Las invitaciones vencidas se muestran marcadas para que el dueño las borre o cree otra. */
function estaVencida(venceEn: string) {
  return Date.parse(venceEn) <= Date.now();
}

export default async function EquipoPage() {
  const { tallerId, userId, rol, taller } = await obtenerSesion();
  if (!puede(rol, "equipo")) return <SinPermiso que="el equipo del taller" />;

  const supabase = await createClient();
  const [{ data: usuarios, error }, { data: invitaciones }, origen] = await Promise.all([
    supabase
      .from("usuarios")
      .select("id, nombre, email, rol, activo")
      .eq("taller_id", tallerId)
      .order("activo", { ascending: false })
      .order("nombre"),
    supabase
      .from("invitaciones")
      .select("id, email, rol, token, vence_en")
      .eq("taller_id", tallerId)
      .is("usada_en", null)
      .order("creada_en", { ascending: false }),
    origenActual(),
  ]);

  if (error) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {faltaMigracion(error) ? MENSAJE_FALTA_MIGRACION : "No se pudo cargar el equipo. Recargá la página."}
      </p>
    );
  }

  const nombreTaller = taller?.nombre ?? "el taller";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Equipo</h1>
        <p className="text-sm text-slate-500">Quiénes usan la app en {nombreTaller} y qué puede hacer cada uno.</p>
      </div>

      <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {(usuarios ?? []).map((u) => (
          <FilaMiembro key={`${u.id}-${u.rol}-${u.activo}`} usuario={u} esYo={u.id === userId} />
        ))}
      </ul>

      <Tarjeta>
        <h2 className="font-semibold text-slate-900">Crear usuario</h2>
        <p className="mb-4 text-sm text-slate-500">
          Creás el usuario con una contraseña y se la pasás a la persona. Entra al toque, sin mails de confirmación.
        </p>
        <FormCrearEmpleado />
      </Tarjeta>

      <Tarjeta>
        <h2 className="font-semibold text-slate-900">Invitar a alguien</h2>
        <p className="mb-4 text-sm text-slate-500">
          Se crea un enlace para que la persona arme su usuario. No se manda ningún email: se lo pasás vos.
        </p>
        <FormInvitar taller={nombreTaller} />
      </Tarjeta>

      {invitaciones && invitaciones.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-900">Invitaciones pendientes</h2>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {invitaciones.map((i) => (
              <FilaInvitacion
                key={i.id}
                invitacion={{
                  id: i.id,
                  email: i.email,
                  rol: i.rol,
                  vencida: estaVencida(i.vence_en),
                  venceTexto: fechaCorta.format(new Date(i.vence_en)),
                }}
                link={linkInvitacion(origen, i.token)}
                taller={nombreTaller}
              />
            ))}
          </ul>
        </section>
      )}

      <Tarjeta>
        <h2 className="mb-2 font-semibold text-slate-900">Qué puede hacer cada rol</h2>
        <ul className="space-y-1 text-sm text-slate-600">
          {ROLES.map((r) => (
            <li key={r.valor}>
              <span className="font-medium text-slate-900">{r.label}:</span> {r.descripcion}.
            </li>
          ))}
        </ul>
      </Tarjeta>
    </div>
  );
}
