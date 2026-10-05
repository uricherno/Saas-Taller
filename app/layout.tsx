import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Taller App", template: "%s · Taller App" },
  description: "Gestión para talleres mecánicos",
  applicationName: "Taller App",
  // iOS: al agregarla a la pantalla de inicio se abre sin la barra de Safari.
  appleWebApp: { capable: true, title: "Taller App", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/iconos/icono-192.png", sizes: "192x192", type: "image/png" },
      { url: "/iconos/icono-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/iconos/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#334155",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
