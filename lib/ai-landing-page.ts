import { sanitizeHtml } from "./sanitize";
import type { GeneratedImage, GeneratedPage, GenerationInput } from "./generator";
import { slugify } from "./generator";

type Video = { id: string; title: string; channelTitle: string; embedUrl: string };
type GeminiDraft = { name: string; category: string; description: string; audience: string; pricing: string; features: string[]; title: string; seoTitle: string; seoDescription: string; keywords: string[]; articleHtml: string };
const textOnly = (html: string) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export class AiGenerationError extends Error {
  constructor(message: string, public status = 500) {
    super(message);
    this.name = "AiGenerationError";
  }
}

export async function readOfficialPage(url: string) {
  const fallback = { title: new URL(url).hostname.replace(/^www\./, ""), text: "The official website did not allow automated reading. Use only facts that can be safely inferred from the supplied URL and clearly mark product details and pricing for editorial verification." };
  try {
    const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; FikraInAction/1.0)", accept: "text/html,application/xhtml+xml" }, redirect: "follow", signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!response.ok) return fallback;
    const html = await response.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, " ").trim() || fallback.title;
    const text = textOnly(html).slice(0, 28_000);
    return { title, text: text || fallback.text };
  } catch {
    return fallback;
  }
}

export async function createGeminiDraft(officialUrl: string, affiliateUrl: string, source: { title: string; text: string }) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new AiGenerationError("AI generation is not configured yet. Add the GEMINI_API_KEY secret to Firebase App Hosting, grant the App Hosting backend access to it, and redeploy.", 503);
  const prompt = `You are the senior editor for Fikra in Action, an independent practical technology review website. Research only from the supplied official-page text. Create an original, useful, balanced 1,800-2,500 word English affiliate landing page. Never invent prices, capabilities, statistics, testimonials, or awards. Mark unavailable facts as needing verification. Return ONLY valid JSON with these keys: name, category, description, audience, pricing, features (array), title, seoTitle, seoDescription, keywords (array), articleHtml. articleHtml must contain semantic sections with h2/h3/p/ul/table where useful, including overview, key capabilities, use cases, pricing and packages, setup/workflow, pros and cons, alternatives/comparison guidance, FAQ, verdict, and affiliate disclosure. Do not include h1, scripts, styles, images, iframes, or markdown. Official URL: ${officialUrl}. Affiliate destination: ${affiliateUrl || officialUrl}. Page title observed: ${source.title}. Official page text: ${source.text}`;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
  let response: Response;
  try {
    response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.35 } }), signal: AbortSignal.timeout(55_000), cache: "no-store" });
  } catch {
    throw new AiGenerationError("Gemini did not respond in time. Please try the generation again.", 504);
  }
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new AiGenerationError("Gemini rejected the server API key. Check the GEMINI_API_KEY secret and its API restrictions, then redeploy.", 503);
    if (response.status === 429) throw new AiGenerationError("The Gemini quota is currently exhausted. Check billing and quota for the API key, or try again later.", 503);
    throw new AiGenerationError(`Gemini could not generate the article (service response ${response.status}). Please try again.`, 502);
  }
  const payload = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (!content) throw new AiGenerationError("Gemini returned an empty article. Please try again.", 502);
  try {
    return JSON.parse(content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as GeminiDraft;
  } catch {
    throw new AiGenerationError("Gemini returned an incomplete article. Please run the generation again.", 502);
  }
}

export async function findYouTubeVideos(query: string): Promise<Video[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];
  const endpoint = new URL("https://www.googleapis.com/youtube/v3/search");
  for (const [name, value] of Object.entries({ part: "snippet", type: "video", videoEmbeddable: "true", safeSearch: "strict", maxResults: "3", q: `${query} tutorial review`, key })) endpoint.searchParams.set(name, value);
  const response = await fetch(endpoint, { signal: AbortSignal.timeout(12_000), cache: "no-store" });
  if (!response.ok) return [];
  const payload = await response.json() as { items?: { id?: { videoId?: string }; snippet?: { title?: string; channelTitle?: string } }[] };
  return (payload.items || []).flatMap((item) => item.id?.videoId ? [{ id: item.id.videoId, title: item.snippet?.title || `${query} tutorial`, channelTitle: item.snippet?.channelTitle || "YouTube", embedUrl: `https://www.youtube-nocookie.com/embed/${item.id.videoId}` }] : []);
}

const esc = (value: string) => value.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] || c));
export function assembleAiPage(draft: GeminiDraft, officialUrl: string, affiliateUrl: string, images: GeneratedImage[], videos: Video[]): { page: GeneratedPage; product: GenerationInput } {
  const destination = affiliateUrl || officialUrl;
  const heroImage = images[0] ? `<figure class="generated-media generated-hero-media"><img src="${esc(images[0].url)}" alt="${esc(images[0].alt)}" loading="lazy"/><figcaption>Source: <a href="${esc(images[0].sourceUrl)}" target="_blank" rel="noopener nofollow">${esc(images[0].sourceLabel)}</a></figcaption></figure>` : "";
  const imageGallery = images.length > 1 ? `<section><h2>${esc(draft.name)} at a glance</h2><div class="generated-image-grid">${images.slice(1).map((item) => `<figure class="generated-media"><img src="${esc(item.url)}" alt="${esc(item.alt)}" loading="lazy"/><figcaption>Source: <a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener nofollow">${esc(item.sourceLabel)}</a></figcaption></figure>`).join("")}</div></section>` : "";
  const videoHtml = videos.length ? `<section><h2>Useful ${esc(draft.name)} video tutorials</h2><div class="generated-video-grid">${videos.map((video) => `<article><iframe src="${video.embedUrl}" title="${esc(video.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe><h3>${esc(video.title)}</h3><p>${esc(video.channelTitle)}</p></article>`).join("")}</div></section>` : "";
  const disclosure = "Fikra in Action may earn a commission when you purchase or register through links on this page. This does not affect the price you pay or our editorial evaluation.";
  const html = sanitizeHtml(`<section class="generated-hero"><p class="generated-kicker">${esc(draft.category)} · AI-researched guide</p><h1>${esc(draft.title)}</h1><p>${esc(draft.description)}</p>${heroImage}<a class="generated-cta" href="${esc(destination)}" rel="sponsored nofollow noopener" target="_blank">Visit ${esc(draft.name)} ↗</a></section><aside class="generated-disclosure"><strong>Affiliate disclosure:</strong> ${disclosure}</aside>${draft.articleHtml}${imageGallery}${videoHtml}<section class="generated-final"><h2>Explore ${esc(draft.name)}</h2><p>Review current plans and terms on the official website before subscribing.</p><a class="generated-cta" href="${esc(destination)}" rel="sponsored nofollow noopener" target="_blank">Visit the official website ↗</a></section>`);
  const product: GenerationInput = { name: draft.name, type: "AI tool", category: draft.category, description: draft.description, officialUrl, affiliateUrl: destination, audience: draft.audience, features: draft.features.join("\n"), pricing: draft.pricing, pageType: "Full Product Review", tone: "Practical and credible" };
  return { product, page: { title: draft.title, slug: `${slugify(draft.name)}-review`, pageType: "Full Product Review", seo: { title: draft.seoTitle, description: draft.seoDescription, keywords: draft.keywords }, hero: { headline: draft.title, subheadline: draft.description, primaryCta: { text: `Visit ${draft.name}`, url: destination } }, sections: [], images, videos, html, affiliateDisclosure: disclosure, warnings: ["AI-generated draft: verify pricing, features, availability, images, and video relevance before publishing.", ...(videos.length ? [] : ["No YouTube videos were added. Configure YOUTUBE_API_KEY to enable tutorial discovery."])] } };
}
