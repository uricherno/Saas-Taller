# Pendientes

Actualizado: 7/10/2026. Lo que está marcado con [x] ya está hecho.

## Ya hecho

- [x] Migraciones 20261004 → 20261014 corridas en producción (verificado con `supabase/verificar_migraciones.sql`).
- [x] Diagnóstico del registro: el trigger `handle_new_user` funciona. El error viene del **envío del mail** (el mail de fábrica de Supabase solo manda a los miembros del equipo).
- [x] La terminal muestra el error real de Supabase cuando no se reconoce.
- [x] `uricherno@gmail.com` es admin del SaaS (pestaña **Admin** en la app).
- [x] Código nuevo: link público de la orden, cobros, fotos, resumen del mes, stock, tablas de turnos y encuestas, panel de admin.
- [x] Archivos basura de la raíz borrados (rompían el build de Vercel).

---

## 1. Subir el código (antes que nada)

El código nuevo **todavía no está en GitHub**: Vercel no lo puede publicar hasta que se suba.

En la terminal de VS Code (o pedíselo a Claude):

```
git add -A
git commit -m "Link público, cobros, fotos, stock, resumen del mes y panel de admin"
git push
```

Antes, si querés, borrá `supabase/migraciones_10_a_14_juntas.sql`: fue solo para correr las migraciones de una vez.

## 2. Publicar en Vercel

1. Supabase → **Project Settings** → **API Keys**: copiá la **Project URL** y la clave **publishable** (o *anon*).
2. Vercel → tu proyecto → **Settings** → **Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL` = la Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = la clave publishable
3. Supabase → **Authentication** → **URL Configuration**:
   - **Site URL:** `https://tu-app.vercel.app`
   - **Redirect URLs:** `https://tu-app.vercel.app/**` y `http://localhost:3000/**`
4. En Vercel → **Deployments**, volvé a publicar (**Redeploy**) para que tome las variables.

## 3. Mails (cuando se pueda)

Mientras no haya SMTP propio: dejar **apagado** Authentication → Sign In / Providers → Email → **Confirm email**. Sin SMTP, "Olvidé mi contraseña" no le llega a la gente de afuera.

**Opción rápida, sin dominio: Gmail**
1. Crear un Gmail para la app (ej: `tallerapp.avisos@gmail.com`).
2. myaccount.google.com → Seguridad → activar **Verificación en 2 pasos**.
3. myaccount.google.com/apppasswords → crear "Supabase" → copiar la clave de 16 letras.
4. Supabase → **Authentication** → **Emails** → **SMTP Settings** → **Enable custom SMTP**:
   - Sender email y Username: el Gmail
   - Sender name: `Taller App`
   - Host: `smtp.gmail.com` · Port: `465`
   - Password: la clave de 16 letras (sin espacios)

**Opción definitiva, con dominio propio: Resend**
1. Comprar un dominio (Nic.ar para `.com.ar`, o Cloudflare/Namecheap para `.com`).
2. Crear cuenta en resend.com, agregar el dominio y pegar los registros DNS donde lo compraste.
3. En SMTP Settings: Host `smtp.resend.com`, Port `465`, Username `resend`, Password = API key de Resend, Sender `no-reply@tudominio`.

**Después de configurar el SMTP:**
- Activar **Confirm email**.
- Probar: registrarse con otro email y ver que llegue el mail (revisar spam). Probar también "Olvidé mi contraseña".

## 4. Supabase de prueba

**4.1 Exportar el esquema** (necesita **Docker Desktop** abierto). En la terminal de VS Code:

```
npx supabase login
npx supabase link --project-ref TU-REF
npx supabase db dump --schema-only -f supabase/schema.sql
```

`TU-REF` es el código que aparece en la URL del proyecto: `supabase.com/dashboard/project/TU-REF`.
Después hacé commit de `supabase/schema.sql`.

**4.2 Crear el proyecto de prueba:** supabase.com → **New project** (gratis).

**4.3 En su SQL Editor, correr en este orden:**
1. `supabase/schema.sql`
2. `supabase/migrations/20261011_fotos_ordenes.sql` (crea el bucket de fotos, que no viene en el esquema)
3. `supabase/seed.sql` (datos falsos)
4. `supabase/tests/aislamiento_y_roles.sql` → tiene que decir **TODAS LAS PRUEBAS PASARON**

Usuarios de prueba (contraseña de todos: `Prueba1234`):
- `dueno.a@prueba.test`, `recepcion.a@prueba.test`, `mecanico.a@prueba.test` (Taller El Pistón)
- `dueno.b@prueba.test` (Lubricentro Sur)

**4.4 Dar acceso a otra persona:** Organization settings → **Team** → **Invite** → rol **Developer**.

## 5. Seguridad y backups

- [ ] Correr `supabase/tests/aislamiento_y_roles.sql` en el proyecto de prueba (punto 4.3). Prueba que un taller no ve datos de otro y que cada rol hace solo lo suyo.
- [ ] Pasar el proyecto de producción al plan **Pro** (USD 25/mes): incluye backups diarios automáticos.
- [ ] Probar restaurar un backup: Database → **Backups**. Usar "restaurar en un proyecto nuevo" si aparece la opción. **Nunca** restaurar sobre producción para probar: pisa los datos actuales.

## 6. Probar en la app publicada

Entrar como dueño y revisar:

- [ ] **/inicio:** resumen del mes (facturación, órdenes terminadas, ticket promedio, autos en el taller).
- [ ] **Orden → Cobros:** registrar una seña y un pago; ver que baje el saldo.
- [ ] **Orden → Link para el cliente:** crear el link, abrirlo en una ventana de incógnito, aceptar el presupuesto y ver que el taller lo vea aceptado.
- [ ] **Orden → Fotos:** subir una foto desde el celular.
- [ ] **Precios:** cargar stock y stock mínimo a un repuesto; usarlo en una orden "en proceso" y ver que baje el stock.
- [ ] **Cobros:** ver la lista de clientes que deben.
- [ ] **Admin:** ver la lista de talleres. Suspender uno de prueba, ver que no pueda entrar y reactivarlo.

## 7. Más adelante (Hoja de ruta 1)

- Pantallas de **turnos** y **encuestas de satisfacción**: las tablas ya están creadas (migración 20261013), faltan las pantallas.
