import { FirebaseAccessError, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import type { GenerationInput } from "../../../lib/generator";
import { discoverProductImages } from "../../../lib/image-discovery";
import { AiGenerationError, assembleAiPage, createGeminiDraft, findYouTubeVideos, readOfficialPage } from "../../../lib/ai-landing-page";

function normalizeWebUrl(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const candidate = /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || !url.hostname) return "";
    return url.href;
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const body = await request.json() as Pick<GenerationInput, "officialUrl" | "affiliateUrl">;
    const officialUrl = normalizeWebUrl(body.officialUrl);
    const affiliateUrl = body.affiliateUrl?.trim() ? normalizeWebUrl(body.affiliateUrl) : "";
    if (!officialUrl) return Response.json({ error: "Enter a valid product URL, such as example.com or https://example.com." }, { status: 400 });
    if (body.affiliateUrl?.trim() && !affiliateUrl) return Response.json({ error: "The saved affiliate URL is invalid. Clear it or enter a valid web address." }, { status: 400 });
    const source = await readOfficialPage(officialUrl);
    const draft = await createGeminiDraft(officialUrl, affiliateUrl, source);
    const product: GenerationInput = { name: draft.name, type: "AI tool", category: draft.category, description: draft.description, officialUrl, affiliateUrl: affiliateUrl || officialUrl, audience: draft.audience, features: draft.features.join("\n"), pricing: draft.pricing, pageType: "Full Product Review" };
    const [images, videos] = await Promise.all([discoverProductImages(product), findYouTubeVideos(draft.name)]);
    return Response.json({ ...assembleAiPage(draft, officialUrl, affiliateUrl, images, videos), mode: "gemini-link-only", imageMode: images.length ? "official-online-images" : "no-image-found" });
  } catch (error) {
    if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AiGenerationError) return Response.json({ error: error.message, code: "AI_GENERATION_ERROR" }, { status: error.status });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate the page." }, { status: 500 });
  }
}
