import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // exceljs (lista de precios) se usa tal cual desde node_modules, sin empaquetarlo:
  // empaquetado falla en algunas instalaciones con "Can't resolve 'rimraf'".
  serverExternalPackages: ["exceljs"],
  experimental: {
    serverActions: {
      // Las listas de precios (Excel/CSV) pueden pesar varios MB. El default es 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
