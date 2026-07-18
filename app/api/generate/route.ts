import { AiGenerationError, generateAiLandingDraft, generateAndStoreAiImages } from "../../../lib/ai-generator";
import { FirebaseAccessError, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { generateStructuredPage, type GenerationInput } from "../../../lib/generator";
import { discoverProductImages } from "../../../lib/image-discovery";
import { researchPlatform, validatePublicPlatformUrl } from "../../../lib/platform-research";
import { findRelevantYouTubeVideos } from "../../../lib/youtube";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseAdmin(request);
    const input = await request.json() as Partial<GenerationInput>;
    const platformUrl = String(input.platformUrl || "").trim();
    if (!platformUrl) return Response.json({ error: "Paste the platform or affiliate link to continue." }, { status: 400 });
    try { await validatePublicPlatformUrl(platformUrl); }
    catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Enter a valid public platform link." }, { status: 400 }); }

    const research = await researchPlatform(platformUrl);
    const draft = await generateAiLandingDraft(research);
    const [officialImages, youtube] = await Promise.all([
      discoverProductImages({ name: draft.product.name, officialUrl: research.canonicalUrl }),
      findRelevantYouTubeVideos(draft.article.videoSearchQuery || `${draft.product.name} tutorial demo`),
    ]);
    const aiMedia = await generateAndStoreAiImages(draft, user.email || user.uid);
    const warnings = [youtube.warning, aiMedia.warning].filter((value): value is string => Boolean(value));
    const page = generateStructuredPage(draft, [...aiMedia.images, ...officialImages], youtube.videos, research, warnings);
    return Response.json({
      page,
      mode: "ai-researched-draft",
      researchMode: "official-site-evidence",
      imageMode: aiMedia.images.length ? "ai-generated-and-official-media" : officialImages.length ? "official-media-fallback" : "no-image-found",
      videoMode: youtube.videos.length ? "youtube-data-api" : "no-video-found",
    });
  } catch (error) {
    if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof AiGenerationError) return Response.json({ error: error.message, code: error.code, setupUrl: error.setupUrl }, { status: error.code === "AI_SETUP_REQUIRED" ? 503 : 502 });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate the landing page." }, { status: 500 });
  }
}
