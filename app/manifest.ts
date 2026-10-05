import type { MetadataRoute } from "next";

// Permite "Agregar a pantalla de inicio" y abrir la app a pantalla completa.
// No hay modo offline (no hay service worker): la app necesita conexión.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Taller App",
    short_name: "Taller App",
    description: "Gestión de clientes, vehículos y órdenes para talleres mecánicos",
    lang: "es-AR",
    start_url: "/inicio",
    scope: "/",
    display: "fullscreen",
    // Si el navegador no soporta pantalla completa, usa ventana propia sin barra del navegador.
    display_override: ["fullscreen", "standalone"],
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#334155",
    icons: [
      { src: "/iconos/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/iconos/icono-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
