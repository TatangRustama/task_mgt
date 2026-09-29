import type { Metadata, Viewport } from "next";
import { Open_Sans, Roboto } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-open-sans",
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Manajemen Tugas — Peningkatan Kinerja ASN",
  description: "Delegasi tugas, board unit, bukti foto+geo-tag, dan laporan kinerja bulanan",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Manajemen Tugas",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
    themeColor: "#1B2156",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${openSans.variable} ${roboto.variable} h-full`} suppressHydrationWarning>
      <body
        className={`${openSans.className} min-h-full bg-background font-sans text-on-background antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
