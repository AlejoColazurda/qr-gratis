import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QR Gratis | Generador Premium con Historial",
  description: "Crea códigos QR personalizados, con estilo propio, logotipos y sin caducidad de forma gratuita.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
