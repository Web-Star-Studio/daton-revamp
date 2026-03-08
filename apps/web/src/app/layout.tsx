import type { Metadata } from "next";
import { DM_Serif_Display, Inter } from "next/font/google";
import type { PropsWithChildren } from "react";

import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

const serif = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-serif",
});

export const metadata: Metadata = {
  title: {
    default: "Daton",
    template: "%s | Daton",
  },
  description:
    "Daton é uma plataforma operacional para organizações com múltiplas filiais que precisam de governança sobre pessoas, unidades e documentos.",
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html className={`${sans.variable} ${serif.variable}`} lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
