import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import SwRegister from "@/components/SwRegister";

export const metadata: Metadata = {
  title: "ParkPilot – Dein Park-Copilot",
  description:
    "Parkzonen in deiner Nähe finden, Tarife und Höchstparkdauer checken und den digitalen Parkschein direkt am Handy lösen.",
  applicationName: "ParkPilot",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ParkPilot",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#1e3a8a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="h-dvh w-full overflow-hidden bg-slate-100 text-slate-900 antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
