import type { Metadata } from "next";
import { BRAND_NAME, SITE_URL, type Locale, localizedPath } from "../i18n/config";

export function buildPageMetadata(options: {
  locale: Locale;
  title: string;
  description: string;
  path?: string;
  /** Per-locale paths when AR/EN slugs differ (e.g. linked blog translations). */
  alternatePaths?: Partial<Record<Locale, string>>;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
}): Metadata {
  const path = options.path ?? "/";
  const arPath = options.alternatePaths?.ar ?? path;
  const enPath = options.alternatePaths?.en ?? path;
  const canonical = `${SITE_URL}${localizedPath(options.locale, path)}`;
  const arUrl = `${SITE_URL}${localizedPath("ar", arPath)}`;
  const enUrl = `${SITE_URL}${localizedPath("en", enPath)}`;

  return {
    title: options.title,
    description: options.description,
    metadataBase: new URL(SITE_URL),
    alternates: {
      canonical,
      languages: {
        ar: arUrl,
        en: enUrl,
        "x-default": arUrl,
      },
    },
    openGraph: {
      title: options.title,
      description: options.description,
      url: canonical,
      siteName: BRAND_NAME,
      locale: options.locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: options.locale === "ar" ? ["en_US"] : ["ar_AR"],
      type: options.type ?? "website",
      images: options.image ? [{ url: options.image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: options.title,
      description: options.description,
      images: options.image ? [options.image] : undefined,
    },
    robots: options.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}
