import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type ResearchSource = {
  title: string;
  url: string;
  text: string;
};

export type PlatformResearch = {
  submittedUrl: string;
  canonicalUrl: string;
  siteName: string;
  description: string;
  sources: ResearchSource[];
  researchedAt: string;
};

const MAX_PAGE_BYTES = 1_250_000;
const MAX_SOURCE_TEXT = 14_000;
const MAX_REDIRECTS = 4;

function isPrivateAddress(address: string) {
  if (address === "::1" || address === "0.0.0.0") return true;
  if (address.startsWith("10.") || address.startsWith("127.") || address.startsWith("169.254.") || address.startsWith("192.168.")) return true;
  const parts = address.split(".").map(Number);
  if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  const normalized = address.toLowerCase();
  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:") || normalized === "::";
}

export async function validatePublicPlatformUrl(value: string) {
  const url = new URL(value);
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error("Enter a public http or https platform link.");
  if (["localhost", "localhost.localdomain"].includes(url.hostname.toLowerCase())) throw new Error("Local and private addresses cannot be researched.");
  const directIp = isIP(url.hostname) ? url.hostname : null;
  if (directIp && isPrivateAddress(directIp)) throw new Error("Local and private addresses cannot be researched.");
  if (!directIp) {
    const results = await lookup(url.hostname, { all: true });
    if (!results.length || results.some((result) => isPrivateAddress(result.address))) throw new Error("The platform link does not resolve to a public website.");
  }
  return url;
}

async function safeFetch(initialUrl: URL) {
  let current = initialUrl;
  for (let attempt = 0; attempt <= MAX_REDIRECTS; attempt += 1) {
    await validatePublicPlatformUrl(current.href);
    const response = await fetch(current, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "FikraInActionResearchBot/1.0 (+https://fikrainaction.com)",
      },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) throw new Error("The platform redirected without a destination.");
      current = new URL(location, current);
      continue;
    }
    if (!response.ok) throw new Error(`The platform returned HTTP ${response.status}.`);
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) throw new Error("The supplied link is not an HTML platform page.");
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > MAX_PAGE_BYTES) throw new Error("The platform page is too large to research safely.");
    const html = (await response.text()).slice(0, MAX_PAGE_BYTES);
    return { responseUrl: new URL(response.url || current.href), html };
  }
  throw new Error("The platform redirected too many times.");
}

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function metadata(html: string, responseUrl: URL) {
  const title = decodeEntities((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || responseUrl.hostname.replace(/^www\./, "")).replace(/<[^>]+>/g, " ").trim());
  const descriptionMatch = html.match(/<meta[^>]+(?:name|property)=["'](?:description|og:description)["'][^>]+content=["']([^"']+)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:description|og:description)["'][^>]*>/i);
  return { title, description: decodeEntities(descriptionMatch?.[1] || "").trim() };
}

function visibleText(html: string) {
  return decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|svg|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|li|tr|section|article|div)>/gi, "\n")
    .replace(/<[^>]+>/g, " "))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => line.length > 2)
    .join("\n")
    .slice(0, MAX_SOURCE_TEXT);
}

function usefulLinks(html: string, baseUrl: URL) {
  const matches = [...html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi)];
  const candidates = matches.flatMap((match) => {
    try {
      const url = new URL(match[1], baseUrl);
      if (url.origin !== baseUrl.origin || !/^https?:$/.test(url.protocol)) return [];
      const label = decodeEntities(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
      const haystack = `${url.pathname} ${label}`.toLowerCase();
      const score = ["pricing", "plans", "features", "product", "solutions", "security"].reduce((total, word) => total + (haystack.includes(word) ? 1 : 0), 0);
      return score ? [{ url, score, label }] : [];
    } catch {
      return [];
    }
  });
  const seen = new Set<string>();
  return candidates
    .sort((a, b) => b.score - a.score)
    .filter((candidate) => {
      const key = `${candidate.url.origin}${candidate.url.pathname.replace(/\/$/, "")}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
}

export async function researchPlatform(platformUrl: string): Promise<PlatformResearch> {
  const submitted = await validatePublicPlatformUrl(platformUrl);
  const primary = await safeFetch(submitted);
  const primaryMeta = metadata(primary.html, primary.responseUrl);
  const sources: ResearchSource[] = [{ title: primaryMeta.title || "Official platform website", url: primary.responseUrl.href, text: visibleText(primary.html) }];

  const followUps = usefulLinks(primary.html, primary.responseUrl);
  const results = await Promise.allSettled(followUps.map(async (candidate) => {
    const page = await safeFetch(candidate.url);
    const meta = metadata(page.html, page.responseUrl);
    return { title: meta.title || candidate.label || "Official platform information", url: page.responseUrl.href, text: visibleText(page.html) } satisfies ResearchSource;
  }));
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.text.length > 100) sources.push(result.value);
  }

  if (sources[0].text.length < 150) throw new Error("The platform page did not expose enough readable information. Try its public homepage or pricing page.");
  return {
    submittedUrl: submitted.href,
    canonicalUrl: primary.responseUrl.href,
    siteName: primaryMeta.title,
    description: primaryMeta.description,
    sources,
    researchedAt: new Date().toISOString(),
  };
}
