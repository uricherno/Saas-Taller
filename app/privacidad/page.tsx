import type { Metadata } from "next";
import DocumentoLegal from "@/components/documento-legal";

export const metadata: Metadata = { title: "Política de privacidad" };

// BORRADOR: completar los datos entre [corchetes] y revisar con un abogado.
export default function PrivacidadPage() {
  return (
    <DocumentoLegal titulo="Política de privacidad" actualizado="[completar fecha]">
      <section>
        <h2>1. Responsable</h2>
        <p>
          El responsable del tratamiento de los datos de las cuentas de usuario es [razón social], CUIT [número], con
          domicilio en [domicilio], República Argentina. Contacto: [email de contacto].
        </p>
        <p>
          Respecto de los datos de clientes y vehículos que carga cada taller, el responsable es el taller, y nosotros
          actuamos como encargados del tratamiento: los procesamos solo para prestarle el Servicio.
        </p>
      </section>

      <section>
        <h2>2. Qué datos tratamos</h2>
        <ul>
          <li>
            <strong>De los usuarios:</strong> nombre, email, taller al que pertenecen, rol y registros técnicos de acceso.
          </li>
          <li>
            <strong>Que carga el taller:</strong> datos de sus clientes (nombre, teléfono, notas), vehículos (patente,
            marca, modelo, kilometraje), órdenes de trabajo, presupuestos e interacciones.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. Para qué los usamos</h2>
        <ul>
          <li>Prestar el Servicio: crear la cuenta, guardar la información y mostrarla a los usuarios del taller.</li>
          <li>Enviar emails necesarios (confirmación de cuenta, recuperación de contraseña).</li>
          <li>Mantener la seguridad y resolver problemas técnicos.</li>
        </ul>
        <p>No vendemos ni alquilamos datos personales, y no los usamos para publicidad de terceros.</p>
      </section>

      <section>
        <h2>4. Dónde se guardan</h2>
        <p>
          Los datos se alojan en servicios de infraestructura de terceros (por ejemplo, Supabase para la base de datos y
          la autenticación), que pueden estar fuera de la Argentina. [Revisar con un abogado: transferencia
          internacional de datos y proveedores efectivamente utilizados.]
        </p>
        <p>
          Cada taller solo puede ver sus propios datos, y dentro del taller el acceso depende del rol de cada usuario.
        </p>
      </section>

      <section>
        <h2>5. Cuánto tiempo</h2>
        <p>
          Guardamos los datos mientras la cuenta esté activa. [Completar: plazo de eliminación después de la baja y
          copias de seguridad.]
        </p>
      </section>

      <section>
        <h2>6. Tus derechos</h2>
        <p>
          Podés pedir acceso, rectificación, actualización o supresión de tus datos escribiendo a [email de contacto]. El
          derecho de acceso puede ejercerse en forma gratuita a intervalos no inferiores a seis meses, salvo interés
          legítimo (Ley 25.326, art. 14 inc. 3). Los clientes de un taller deben dirigirse primero a ese taller.
        </p>
        <p>
          La Agencia de Acceso a la Información Pública (AAIP), en su carácter de órgano de control de la Ley 25.326,
          tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus
          derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.
        </p>
      </section>

      <section>
        <h2>7. Cookies</h2>
        <p>
          Usamos solo las cookies necesarias para mantener la sesión iniciada. No usamos cookies de publicidad ni de
          seguimiento.
        </p>
      </section>

      <section>
        <h2>8. Cambios</h2>
        <p>Si cambiamos esta política de forma importante, lo vamos a avisar en la app o por email.</p>
      </section>
    </DocumentoLegal>
  );
}
