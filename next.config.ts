import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Las listas de precios (Excel/CSV) pueden pesar varios MB. El default es 1 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
