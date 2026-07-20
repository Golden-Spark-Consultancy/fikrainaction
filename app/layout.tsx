import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteChrome } from "./components/SiteChrome";
import { TagManagerNoScript, Tracking } from "./components/Tracking";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Fikra in Action — Discover. Compare. Act.", template: "%s | Fikra in Action" },
  description: "Practical reviews, comparisons, and guides for AI tools, software, and online services.",
  metadataBase: new URL("https://fikra-e47d9.web.app"),
  openGraph: { title: "Fikra in Action", description: "Discover practical tools. Compare smarter. Take action.", type: "website" },
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}><TagManagerNoScript /><Tracking /><SiteChrome>{children}</SiteChrome></body></html>;
}
