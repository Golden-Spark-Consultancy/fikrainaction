import type { MetadataRoute } from "next";
import { LOCALES, SITE_URL } from "../lib/i18n/config";

const paths = [
  "",
  "/blog",
  "/tools",
  "/search",
  "/about",
  "/contact",
  "/deals",
  "/privacy",
  "/terms",
  "/cookies",
  "/affiliate-disclosure",
  "/editorial-policy",
  "/comment-policy",
  "/accessibility",
  "/category/ai-tools",
  "/category/web-hosting",
  "/category/marketing-software",
  "/category/creator-platforms",
  "/category/artificial-intelligence",
  "/category/programming",
  "/category/hardware",
  "/category/arduino",
  "/category/raspberry-pi",
  "/category/esp32",
  "/category/tutorials",
  "/category/reviews",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];
  for (const locale of LOCALES) {
    for (const path of paths) {
      entries.push({
        url: `${SITE_URL}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === "" ? "daily" : "weekly",
        priority: path === "" ? 1 : 0.7,
        alternates: {
          languages: {
            ar: `${SITE_URL}/ar${path}`,
            en: `${SITE_URL}/en${path}`,
            "x-default": `${SITE_URL}/ar${path}`,
          },
        },
      });
    }
  }
  return entries;
}
