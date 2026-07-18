import type { MetadataRoute } from "next";

const baseUrl = "https://fikrainaction.com";
const routes = [
  "",
  "/tools",
  "/comparisons",
  "/compare/semrush-vs-ahrefs-vs-ubersuggest",
  "/compare/descript-vs-riverside",
  "/compare/notion-ai-vs-clickup",
  "/blog",
  "/tutorials",
  "/deals",
  "/about",
  "/editorial-policy",
  "/review-methodology",
  "/contact",
  "/affiliate-disclosure",
  "/privacy",
  "/terms",
  "/cookies",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date("2026-07-17"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/tools" ? 0.9 : 0.6,
  }));
}
