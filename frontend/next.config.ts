import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Oculta el botón flotante "N" de Next.js en desarrollo (los errores se siguen mostrando).
  devIndicators: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
