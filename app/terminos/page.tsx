import type { Metadata } from "next";
import Link from "next/link";
import DocumentoLegal from "@/components/documento-legal";

export const metadata: Metadata = { title: "Términos y condiciones" };

// BORRADOR: completar los datos entre [corchetes] y revisar con un abogado.
export default function TerminosPage() {
  return (
    <DocumentoLegal titulo="Términos y condiciones" actualizado="[completar fecha]">
      <section>
        <h2>1. Quiénes somos</h2>
        <p>
          Taller App (en adelante, “el Servicio”) es una aplicación web para la gestión de talleres mecánicos, prestada
          por [razón social], CUIT [número], con domicilio en [domicilio], República Argentina (en adelante, “nosotros”).
          Contacto: [email de contacto].
        </p>
      </section>

      <section>
        <h2>2. Aceptación</h2>
        <p>
          Al crear una cuenta o usar el Servicio aceptás estos términos y la{" "}
          <Link href="/privacidad" className="text-blue-600 underline">
            Política de privacidad
          </Link>
          . Si usás el Servicio en nombre de un taller o empresa, declarás que tenés facultades para obligarlo.
        </p>
      </section>

      <section>
        <h2>3. Cuentas y usuarios</h2>
        <ul>
          <li>Tenés que brindar datos verdaderos y mantener la confidencialidad de tu contraseña.</li>
          <li>
            El dueño del taller puede invitar a otras personas y asignarles roles. Es responsable de los usuarios que
            invita y de dar de baja a quienes ya no deban tener acceso.
          </li>
          <li>Avisanos de inmediato si sospechás un uso no autorizado de tu cuenta.</li>
        </ul>
      </section>

      <section>
        <h2>4. Datos que carga el taller</h2>
        <p>
          Los datos de clientes, vehículos y órdenes que cargás pertenecen a tu taller. Vos sos responsable de contar
          con el consentimiento de tus clientes para registrar sus datos y contactarlos (por ejemplo, por WhatsApp),
          conforme a la Ley 25.326 de Protección de Datos Personales. Nosotros tratamos esos datos solo para prestarte
          el Servicio, según la Política de privacidad.
        </p>
        <p>Podés exportar tus datos en cualquier momento desde Ajustes.</p>
      </section>

      <section>
        <h2>5. Uso aceptable</h2>
        <p>No está permitido:</p>
        <ul>
          <li>usar el Servicio para fines ilícitos o para enviar mensajes no solicitados (spam);</li>
          <li>intentar acceder a datos de otros talleres o vulnerar la seguridad del Servicio;</li>
          <li>cargar contenido que infrinja derechos de terceros.</li>
        </ul>
      </section>

      <section>
        <h2>6. Precio y pagos</h2>
        <p>[Completar: si el Servicio es gratuito, de prueba o pago; precio, forma de pago, facturación y renovación.]</p>
      </section>

      <section>
        <h2>7. Disponibilidad y cambios</h2>
        <p>
          Hacemos lo posible para que el Servicio esté disponible y funcione correctamente, pero no garantizamos que esté
          libre de interrupciones o errores. Podemos modificar funciones del Servicio y estos términos; si el cambio es
          importante, te avisaremos con anticipación razonable.
        </p>
      </section>

      <section>
        <h2>8. Responsabilidad</h2>
        <p>
          El Servicio es una herramienta de gestión: los presupuestos, recordatorios y mensajes los decide y envía el
          taller. En la medida que lo permita la ley, no somos responsables por daños indirectos ni por decisiones
          tomadas a partir de la información cargada en el Servicio. [Revisar con un abogado: límites aplicables y
          derechos del consumidor según la Ley 24.240, si corresponde.]
        </p>
      </section>

      <section>
        <h2>9. Baja</h2>
        <p>
          Podés dejar de usar el Servicio cuando quieras. Podemos suspender cuentas que incumplan estos términos. [Completar:
          qué pasa con los datos al dar de baja la cuenta y en qué plazo se eliminan.]
        </p>
      </section>

      <section>
        <h2>10. Ley aplicable</h2>
        <p>
          Estos términos se rigen por las leyes de la República Argentina. [Completar: jurisdicción competente.]
        </p>
      </section>
    </DocumentoLegal>
  );
}
