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
      <body className="min-h-full flex flex-col justify-between">
        <main className="flex-1 w-full">{children}</main>
        <footer className="w-full text-center py-6 border-t border-slate-900/60 bg-slate-950/20 backdrop-blur-md text-xs text-slate-500 font-semibold tracking-wide">
          Hecho por{' '}
          <a
            href="https://potenciapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-350 transition-colors underline decoration-indigo-500/30 hover:decoration-indigo-400"
          >
            potenciapp
          </a>
        </footer>
      </body>
    </html>
  );
}
