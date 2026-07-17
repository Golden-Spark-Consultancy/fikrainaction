import { FirebaseAccessError, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { generateStructuredPage, type GenerationInput } from "../../../lib/generator";
import { discoverProductImages } from "../../../lib/image-discovery";

export async function POST(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const input = await request.json() as GenerationInput;
    const required = ["name", "type", "category", "description", "officialUrl", "affiliateUrl", "audience", "pageType"] as const;
    const missing = required.filter((field) => !input[field]?.trim());
    if (missing.length) return Response.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    try { new URL(input.officialUrl); new URL(input.affiliateUrl); } catch { return Response.json({ error: "Official and affiliate URLs must be valid web addresses." }, { status: 400 }); }
    const images = await discoverProductImages(input);
    return Response.json({ page: generateStructuredPage(input, images), mode: "structured-draft", imageMode: images.length ? "official-online-images" : "no-image-found" });
  } catch (error) {
    if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: error instanceof Error ? error.message : "Unable to generate the page." }, { status: 500 });
  }
}
