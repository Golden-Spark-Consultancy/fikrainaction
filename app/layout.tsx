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
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }, { url: "/favicon.svg" }],
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
  other: {
    "impact-site-verification": "ed2e1286-e474-43a4-8d3a-7dcbfed08349",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" data-locale="ar" suppressHydrationWarning>
      <head>
        {/* Impact requires the non-standard `value` attribute (not only `content`). */}
        <meta
          name="impact-site-verification"
          // @ts-expect-error Impact verification uses `value` instead of `content`
          value="ed2e1286-e474-43a4-8d3a-7dcbfed08349"
        />
      </head>
      <body
        className={`${cairo.variable} ${inter.variable} ${jetbrains.variable} ${cairo.className}`}
      >
        <TagManagerNoScript />
        <Tracking />
        {children}
      </body>
    </html>
  );
}
