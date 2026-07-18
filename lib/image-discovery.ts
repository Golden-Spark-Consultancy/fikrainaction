import type { GeneratedImage } from "./generator";

type ImageDiscoveryInput = { name: string; officialUrl: string };

type MicrolinkMedia = string | { url?: string } | null | undefined;
type MicrolinkPayload = {
  status?: string;
  data?: {
    image?: MicrolinkMedia;
    screenshot?: MicrolinkMedia;
    logo?: MicrolinkMedia;
  };
};

function mediaUrl(media: MicrolinkMedia) {
  return typeof media === "string" ? media : media?.url;
}

function validOnlineImage(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

export async function discoverProductImages(input: ImageDiscoveryInput): Promise<GeneratedImage[]> {
  try {
    const endpoint = new URL("https://api.microlink.io");
    endpoint.searchParams.set("url", input.officialUrl);
    endpoint.searchParams.set("meta", "true");
    endpoint.searchParams.set("screenshot", "true");
    endpoint.searchParams.set("screenshot.type", "jpeg");

    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(9_000),
      cache: "no-store",
    });
    if (!response.ok) return [];

    const payload = await response.json() as MicrolinkPayload;
    if (payload.status !== "success" || !payload.data) return [];

    const candidates: Array<Omit<GeneratedImage, "url"> & { url?: string }> = [
      { url: mediaUrl(payload.data.image), alt: `${input.name} product overview`, sourceLabel: "Official product website", sourceUrl: input.officialUrl, role: "hero", origin: "official" },
      { url: mediaUrl(payload.data.screenshot), alt: `${input.name} official website screenshot`, sourceLabel: "Official product website screenshot", sourceUrl: input.officialUrl, role: "screenshot", origin: "official" },
      { url: mediaUrl(payload.data.logo), alt: `${input.name} logo`, sourceLabel: "Official product website", sourceUrl: input.officialUrl, role: "logo", origin: "official" },
    ];

    const seen = new Set<string>();
    return candidates.flatMap((candidate) => {
      const url = validOnlineImage(candidate.url);
      if (!url || seen.has(url)) return [];
      seen.add(url);
      return [{ ...candidate, url } as GeneratedImage];
    }).slice(0, 3);
  } catch {
    return [];
  }
}
