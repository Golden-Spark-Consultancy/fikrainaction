import { getAdminFirestore, getAdminStorage, getGoogleAccessToken } from "./firebase/admin";
import { slugify, type GeneratedImage } from "./generator";
import type { PlatformResearch } from "./platform-research";

export type AiProduct = {
  name: string;
  type: string;
  category: string;
  description: string;
  officialUrl: string;
  affiliateUrl: string;
  audience: string;
  features: string;
  pricing: string;
  plans: Array<{ name: string; price: string; billing: string; bestFor: string; features: string[] }>;
};

export type AiLandingDraft = {
  product: AiProduct;
  article: {
    title: string;
    seoTitle: string;
    metaDescription: string;
    keywords: string[];
    kicker: string;
    headline: string;
    subheadline: string;
    quickVerdict: string;
    introduction: string[];
    whatItIs: string;
    howItWorks: string;
    featureDetails: Array<{ title: string; description: string }>;
    useCases: Array<{ title: string; description: string }>;
    bestFor: string[];
    notFor: string[];
    pros: string[];
    cons: string[];
    pricingAdvice: string;
    privacySecurity: string;
    alternatives: Array<{ name: string; bestWhen: string }>;
    finalVerdict: string;
    faqs: Array<{ question: string; answer: string }>;
    imagePrompts: string[];
    videoSearchQuery: string;
  };
  factWarnings: string[];
};

type GooglePart = { text?: string; inlineData?: { mimeType?: string; data?: string }; inline_data?: { mime_type?: string; data?: string } };
type GoogleResponse = { candidates?: Array<{ content?: { parts?: GooglePart[] } }> };

export class AiGenerationError extends Error {
  constructor(message: string, public code: "AI_SETUP_REQUIRED" | "AI_GENERATION_FAILED", public setupUrl?: string) {
    super(message);
    this.name = "AiGenerationError";
  }
}

const responseSchema = {
  type: "OBJECT",
  required: ["product", "article", "factWarnings"],
  properties: {
    product: {
      type: "OBJECT",
      required: ["name", "type", "category", "description", "audience", "features", "pricing", "plans"],
      properties: {
        name: { type: "STRING" }, type: { type: "STRING" }, category: { type: "STRING" }, description: { type: "STRING" }, audience: { type: "STRING" }, features: { type: "ARRAY", items: { type: "STRING" } }, pricing: { type: "STRING" },
        plans: { type: "ARRAY", items: { type: "OBJECT", required: ["name", "price", "billing", "bestFor", "features"], properties: { name: { type: "STRING" }, price: { type: "STRING" }, billing: { type: "STRING" }, bestFor: { type: "STRING" }, features: { type: "ARRAY", items: { type: "STRING" } } } } },
      },
    },
    article: {
      type: "OBJECT",
      required: ["title", "seoTitle", "metaDescription", "keywords", "kicker", "headline", "subheadline", "quickVerdict", "introduction", "whatItIs", "howItWorks", "featureDetails", "useCases", "bestFor", "notFor", "pros", "cons", "pricingAdvice", "privacySecurity", "alternatives", "finalVerdict", "faqs", "imagePrompts", "videoSearchQuery"],
      properties: {
        title: { type: "STRING" }, seoTitle: { type: "STRING" }, metaDescription: { type: "STRING" }, keywords: { type: "ARRAY", items: { type: "STRING" } }, kicker: { type: "STRING" }, headline: { type: "STRING" }, subheadline: { type: "STRING" }, quickVerdict: { type: "STRING" }, introduction: { type: "ARRAY", items: { type: "STRING" } }, whatItIs: { type: "STRING" }, howItWorks: { type: "STRING" },
        featureDetails: { type: "ARRAY", items: { type: "OBJECT", required: ["title", "description"], properties: { title: { type: "STRING" }, description: { type: "STRING" } } } },
        useCases: { type: "ARRAY", items: { type: "OBJECT", required: ["title", "description"], properties: { title: { type: "STRING" }, description: { type: "STRING" } } } },
        bestFor: { type: "ARRAY", items: { type: "STRING" } }, notFor: { type: "ARRAY", items: { type: "STRING" } }, pros: { type: "ARRAY", items: { type: "STRING" } }, cons: { type: "ARRAY", items: { type: "STRING" } }, pricingAdvice: { type: "STRING" }, privacySecurity: { type: "STRING" },
        alternatives: { type: "ARRAY", items: { type: "OBJECT", required: ["name", "bestWhen"], properties: { name: { type: "STRING" }, bestWhen: { type: "STRING" } } } },
        finalVerdict: { type: "STRING" }, faqs: { type: "ARRAY", items: { type: "OBJECT", required: ["question", "answer"], properties: { question: { type: "STRING" }, answer: { type: "STRING" } } } }, imagePrompts: { type: "ARRAY", items: { type: "STRING" } }, videoSearchQuery: { type: "STRING" },
      },
    },
    factWarnings: { type: "ARRAY", items: { type: "STRING" } },
  },
};

function projectId() {
  if (process.env.GOOGLE_CLOUD_PROJECT) return process.env.GOOGLE_CLOUD_PROJECT;
  if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  try { return JSON.parse(process.env.FIREBASE_CONFIG || "{}").projectId || "fikra-e47d9"; } catch { return "fikra-e47d9"; }
}

async function googleModelRequest(model: string, body: Record<string, unknown>) {
  const apiKey = process.env.GEMINI_API_KEY;
  const project = projectId();
  const location = process.env.VERTEX_AI_LOCATION || "us-central1";
  const endpoint = apiKey
    ? `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
    : `https://${location}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(location)}/publishers/google/models/${encodeURIComponent(model)}:generateContent`;
  let authorization: string | undefined;
  if (!apiKey) {
    try { authorization = `Bearer ${await getGoogleAccessToken()}`; }
    catch { throw new AiGenerationError("Gemini is not configured. Enable Vertex AI for this Firebase project or add GEMINI_API_KEY to the App Hosting environment.", "AI_SETUP_REQUIRED", `https://console.cloud.google.com/vertex-ai?project=${encodeURIComponent(project)}`); }
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(authorization ? { authorization } : {}) },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(75_000),
    cache: "no-store",
  });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 700);
    if ([401, 403, 404].includes(response.status)) throw new AiGenerationError(`Gemini/Vertex AI is not ready for ${project}. Enable the API and grant the App Hosting service account the Vertex AI User role. ${details}`, "AI_SETUP_REQUIRED", `https://console.cloud.google.com/vertex-ai?project=${encodeURIComponent(project)}`);
    throw new AiGenerationError(`Gemini generation failed with HTTP ${response.status}. ${details}`, "AI_GENERATION_FAILED");
  }
  return await response.json() as GoogleResponse;
}

function textFromResponse(response: GoogleResponse) {
  return response.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

function ensureDraft(value: unknown, research: PlatformResearch): AiLandingDraft {
  if (!value || typeof value !== "object") throw new AiGenerationError("Gemini returned an empty landing-page draft.", "AI_GENERATION_FAILED");
  const draft = value as AiLandingDraft & { product?: AiProduct & { features?: string[] | string } };
  if (!draft.product?.name || !draft.article?.headline || !draft.article?.finalVerdict) throw new AiGenerationError("Gemini returned an incomplete landing-page draft.", "AI_GENERATION_FAILED");
  const features = Array.isArray(draft.product.features) ? draft.product.features : String(draft.product.features || "").split("\n");
  draft.product.features = features.filter(Boolean).join("\n");
  draft.product.officialUrl = research.canonicalUrl;
  draft.product.affiliateUrl = research.submittedUrl;
  draft.product.plans = Array.isArray(draft.product.plans) ? draft.product.plans.slice(0, 6) : [];
  draft.article.featureDetails = (draft.article.featureDetails || []).slice(0, 10);
  draft.article.useCases = (draft.article.useCases || []).slice(0, 8);
  draft.article.faqs = (draft.article.faqs || []).slice(0, 8);
  draft.article.imagePrompts = (draft.article.imagePrompts || []).slice(0, 2);
  draft.factWarnings = Array.isArray(draft.factWarnings) ? draft.factWarnings : [];
  return draft;
}

export async function generateAiLandingDraft(research: PlatformResearch): Promise<AiLandingDraft> {
  const evidence = research.sources.map((source, index) => `SOURCE ${index + 1}: ${source.title}\nURL: ${source.url}\n${source.text}`).join("\n\n---\n\n");
  const checked = new Date(research.researchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const prompt = `You are the senior editor for Fikra in Action, an independent AI-tools and software publication. Create a complete, useful, blog-style affiliate landing page from the official-site evidence below.

NON-NEGOTIABLE RULES
- Use only claims supported by the supplied official-site evidence. Never invent prices, plan limits, integrations, certifications, customer numbers, test results, discounts, urgency, or hands-on experience.
- If a detail is missing or ambiguous, use careful wording and add it to factWarnings. Never disguise uncertainty.
- Pricing must say it was checked on ${checked} and may change. Preserve billing periods and plan limitations when the evidence provides them.
- The article must be genuinely informative, not a thin bridge page. Write substantial natural paragraphs, specific feature explanations, practical use cases, honest limitations, alternatives, privacy/security considerations, and 5-8 useful FAQs.
- Do not say “we tested”, “our test”, or imply first-hand use. Do not use fake ratings or testimonials.
- Aim for 1,800-2,500 publishable words across the fields. Avoid repetitive marketing language.
- imagePrompts must describe two original 16:9 editorial illustrations about the workflow or problem the tool solves. Do not request brand logos, copied UI, trademarks, text labels, or deceptive screenshots.
- videoSearchQuery must be a concise YouTube search for the platform's tutorial, demo, or official walkthrough.
- Output only the requested JSON.

SUBMITTED DESTINATION: ${research.submittedUrl}
CANONICAL PLATFORM PAGE: ${research.canonicalUrl}
SITE TITLE: ${research.siteName}
SITE DESCRIPTION: ${research.description}

OFFICIAL-SITE EVIDENCE
${evidence}`;
  const response = await googleModelRequest(process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash", {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.25, maxOutputTokens: 8192 },
  });
  const text = textFromResponse(response);
  try { return ensureDraft(JSON.parse(text), research); }
  catch (error) {
    if (error instanceof AiGenerationError) throw error;
    throw new AiGenerationError("Gemini returned invalid structured content. Please retry the same platform link.", "AI_GENERATION_FAILED");
  }
}

function imagePart(response: GoogleResponse) {
  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || (part.inline_data ? { mimeType: part.inline_data.mime_type, data: part.inline_data.data } : undefined);
    if (inline?.data && inline.mimeType?.startsWith("image/")) return { data: inline.data, mimeType: inline.mimeType };
  }
  return null;
}

async function generateOneImage(name: string, prompt: string, index: number, userId: string): Promise<GeneratedImage> {
  const response = await googleModelRequest(process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image", {
    contents: [{ role: "user", parts: [{ text: `Create a polished, original 16:9 editorial illustration for an independent article about ${name}. ${prompt}. Clean light silver-blue technology aesthetic with deep navy and electric blue accents. No words, letters, logos, trademarks, copied interface elements, or watermarks beyond the model's required provenance marker.` }] }],
    generationConfig: { responseModalities: ["IMAGE"] },
  });
  const image = imagePart(response);
  if (!image) throw new AiGenerationError("The image model did not return an image.", "AI_GENERATION_FAILED");
  const id = crypto.randomUUID();
  const extension = image.mimeType.includes("jpeg") ? "jpg" : image.mimeType.includes("webp") ? "webp" : "png";
  const objectPath = `generated-media/${new Date().getUTCFullYear()}/${slugify(name)}/${id}.${extension}`;
  const object = (await getAdminStorage()).bucket().file(objectPath);
  const buffer = Buffer.from(image.data, "base64");
  await object.save(buffer, { resumable: false, contentType: image.mimeType, metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: { generatedBy: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image", createdBy: userId, prompt } } });
  const { getDownloadURL } = await import("firebase-admin/storage");
  const url = await getDownloadURL(object);
  const asset = { id, name: `${name} editorial illustration ${index + 1}`, objectPath, contentType: image.mimeType, size: buffer.length, url, origin: "ai-generated", generatedBy: process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image", prompt, uploadedBy: userId, uploadedAt: new Date() };
  await (await getAdminFirestore()).collection("mediaAssets").doc(id).set(asset);
  return { url, alt: `${name} editorial workflow illustration`, sourceLabel: "AI-generated editorial illustration", sourceUrl: "https://fikrainaction.com/editorial-policy", role: index === 0 ? "hero" : "illustration", origin: "generated" };
}

export async function generateAndStoreAiImages(draft: AiLandingDraft, userId: string): Promise<{ images: GeneratedImage[]; warning?: string }> {
  const prompts = draft.article.imagePrompts.slice(0, 2);
  if (!prompts.length) return { images: [], warning: "Gemini did not provide image concepts; add an original illustration during review." };
  const results = await Promise.allSettled(prompts.map((prompt, index) => generateOneImage(draft.product.name, prompt, index, userId)));
  const images = results.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  const failures = results.filter((result) => result.status === "rejected").length;
  return { images, ...(failures ? { warning: `${failures} AI illustration${failures === 1 ? "" : "s"} could not be created. Check Vertex AI image-model access and Firebase Storage.` } : {}) };
}
