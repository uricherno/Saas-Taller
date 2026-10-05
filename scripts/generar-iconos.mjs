// Genera los íconos de la PWA en public/iconos/ a partir de un texto y un color.
//
//   node scripts/generar-iconos.mjs                       → "Taller App", gris pizarra
//   node scripts/generar-iconos.mjs "Taller Pepe" "#1e3a8a"
//
// Para usar un diseño propio: reemplazá los PNG de public/iconos/ por los tuyos
// (mismos nombres y tamaños).
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const nombre = process.argv[2] ?? "Taller App";
const color = process.argv[3] ?? "#334155"; // slate-700, neutro
const salida = path.join(process.cwd(), "public", "iconos");
fs.mkdirSync(salida, { recursive: true });

const iniciales = nombre
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((p) => p[0].toUpperCase())
  .join("");

const escapar = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * `relleno`: qué parte del lienzo puede ocupar el contenido. Los íconos "maskable"
 * de Android se recortan en círculo, así que el texto va más adentro.
 */
function svg(tam, { relleno = 1, redondeado = true } = {}) {
  const r = redondeado ? tam * 0.22 : 0;
  const escala = tam * relleno;
  const largo = nombre.length;
  const tamNombre = Math.min(escala * 0.13, (escala * 1.5) / Math.max(largo, 6));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${tam}" height="${tam}" viewBox="0 0 ${tam} ${tam}">
  <rect width="${tam}" height="${tam}" rx="${r}" fill="${color}"/>
  <text x="50%" y="${tam / 2 + escala * 0.06}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="700"
        font-size="${escala * 0.42}" fill="#ffffff">${escapar(iniciales)}</text>
  <text x="50%" y="${tam / 2 + escala * 0.27}" text-anchor="middle"
        font-family="Arial, Helvetica, sans-serif" font-weight="600"
        font-size="${tamNombre}" fill="#ffffff" fill-opacity="0.85">${escapar(nombre.toUpperCase())}</text>
</svg>`;
}

const iconos = [
  { archivo: "icono-192.png", tam: 192 },
  { archivo: "icono-512.png", tam: 512 },
  { archivo: "icono-maskable-512.png", tam: 512, opciones: { relleno: 0.7, redondeado: false } },
  { archivo: "apple-touch-icon.png", tam: 180, opciones: { redondeado: false } }, // iOS redondea solo
];

for (const { archivo, tam, opciones } of iconos) {
  await sharp(Buffer.from(svg(tam, opciones))).png().toFile(path.join(salida, archivo));
  console.log("✓", path.join("public", "iconos", archivo));
}
fs.writeFileSync(path.join(salida, "icono.svg"), svg(512));
console.log("✓", path.join("public", "iconos", "icono.svg"));
