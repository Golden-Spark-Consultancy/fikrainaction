import type { Metadata } from "next";
import { Cairo, Inter, JetBrains_Mono } from "next/font/google";
import { TagManagerNoScript, Tracking } from "./components/Tracking";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "fikraInAction — From idea to action",
    template: "%s | fikraInAction",
  },
  description:
    "Bilingual technology publication covering AI, programming, hardware, IoT, and practical tutorials.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://fikrainaction.com",
  ),
  openGraph: {
    title: "fikraInAction",
    description: "From idea to action in technology.",
    type: "website",
    siteName: "fikraInAction",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body
        className={`${cairo.variable} ${inter.variable} ${jetbrains.variable}`}
      >
        <TagManagerNoScript />
        <Tracking />
        {children}
      </body>
    </html>
  );
}
