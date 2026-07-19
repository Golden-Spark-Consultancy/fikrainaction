import { FirebaseAccessError, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import type { GenerationInput } from "../../../lib/generator";
import { discoverProductImages } from "../../../lib/image-discovery";
import { assembleAiPage, createGeminiDraft, findYouTubeVideos, readOfficialPage } from "../../../lib/ai-landing-page";

export async function POST(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const body = await request.json() as Pick<GenerationInput, "officialUrl" | "affiliateUrl">;
    if (!body.officialUrl?.trim()) return Response.json({ error: "Enter the official platform URL." }, { status: 400 });
    try { new URL(body.officialUrl); if (body.affiliateUrl) new URL(body.affiliateUrl); } catch { return Response.json({ error: "Enter a valid official or affiliate URL." }, { status: 400 }); }
    const source = await readOfficialPage(body.officialUrl);
    const draft = await createGeminiDraft(body.officialUrl, body.affiliateUrl || "", source);
    const product: GenerationInput = { name: draft.name, type: "AI tool", category: draft.category, description: draft.description, officialUrl: body.officialUrl, affiliateUrl: body.affiliateUrl || body.officialUrl, audience: draft.audience, features: draft.features.join("\n"), pricing: draft.pricing, pageType: "Full Product Review" };
    const [images, videos] = await Promise.all([discoverProductImages(product), findYouTubeVideos(draft.name)]);
    return Response.json({ ...assembleAiPage(draft, body.officialUrl, body.affiliateUrl || "", images, videos), mode: "gemini-link-only", imageMode: images.length ? "official-online-images" : "no-image-found" });
  } catch (error) {
    if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate the page." }, { status: 500 });
  }
}
