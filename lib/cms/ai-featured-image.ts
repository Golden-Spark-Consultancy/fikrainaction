import { createHash, randomUUID } from "node:crypto";
import { discoverProductImages } from "../image-discovery";
import { getAdminFirestore, getAdminStorage } from "../firebase/admin";
import type { MediaDoc } from "../types/cms";
import { COLLECTIONS, LEGACY_COLLECTIONS } from "./collections";

export type FeaturedImageResult = {
  thumbnailUrl?: string;
  thumbnailMediaId?: string;
  thumbnailAlt?: string;
  source: "microlink" | "gemini" | "none";
  warning?: string;
};

function geminiApiKey() {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY ||
    ""
  );
}

function imageModels() {
  const preferred = process.env.GEMINI_IMAGE_MODEL?.trim();
  const defaults = [
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-preview-image-generation",
    "gemini-3.1-flash-image",
  ];
  return [...new Set([preferred, ...defaults].filter(Boolean) as string[])];
}

async function storeGeneratedImage(options: {
  buffer: Buffer;
  contentType: string;
  fileName: string;
  alt: string;
  uploadedBy: string;
  source?: string;
}): Promise<{ url: string; mediaId: string }> {
  const db = await getAdminFirestore();
  const storage = await getAdminStorage();
  const bucket = storage.bucket();
  const { getDownloadURL } = await import("firebase-admin/storage");

  const id = randomUUID();
  const year = new Date().getUTCFullYear();
  const objectPath = `media/${year}/${id}-${options.fileName}`;
  const object = bucket.file(objectPath);
  await object.save(options.buffer, {
    resumable: false,
    contentType: options.contentType,
    metadata: {
      cacheControl: "public, max-age=31536000, immutable",
      metadata: {
        uploadedBy: options.uploadedBy,
        originalName: options.fileName,
        source: options.source || "ai-image",
      },
    },
  });
  const url = await getDownloadURL(object);
  const now = new Date().toISOString();
  const hash = createHash("sha256").update(options.buffer).digest("hex");
  const doc: MediaDoc = {
    id,
    name: options.fileName,
    objectPath,
    contentType: options.contentType,
    size: options.buffer.byteLength,
    url,
    alt: { en: options.alt, ar: options.alt },
    caption: {},
    uploadedBy: options.uploadedBy,
    uploadedAt: now,
    hash,
    usageRefs: [],
  };
  await db.collection(COLLECTIONS.media).doc(id).set(doc);
  await db
    .collection(LEGACY_COLLECTIONS.mediaAssets)
    .doc(id)
    .set(
      {
        id,
        name: doc.name,
        contentType: doc.contentType,
        size: doc.size,
        downloadUrl: url,
        storagePath: objectPath,
        altText: options.alt,
        uploadedBy: doc.uploadedBy,
        uploadedAt: now,
      },
      { merge: true },
    )
    .catch(() => undefined);

  return { url, mediaId: id };
}

/**
 * Generate an image from a freeform prompt (editor insert), store in Media, return URL.
 */
export async function generateAiImageFromPrompt(options: {
  prompt: string;
  alt?: string;
  uploadedBy: string;
}): Promise<{ url: string; mediaId: string; alt: string } | { error: string }> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    return { error: "GEMINI_API_KEY is not configured for image generation." };
  }

  const userPrompt = options.prompt.trim();
  if (!userPrompt) return { error: "Prompt is required." };

  const prompt = `Create a single high-quality editorial image for fikraInAction, a practical technology publication.
User request: ${userPrompt}
Style: modern, clean, cinematic lighting, abstract tech photography or illustration when appropriate, no logos of real brands unless essential, no watermarks, no UI mockups with fake tiny text, composition suitable for embedding in a blog article.`;

  const alt = (options.alt || userPrompt).slice(0, 180);
  let lastError = "";

  for (const model of imageModels()) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 0.8,
          },
        }),
        signal: AbortSignal.timeout(60_000),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string };
              inline_data?: { mime_type?: string; data?: string };
            }>;
          };
        }>;
      };
      if (!response.ok) {
        lastError = payload.error?.message || `HTTP ${response.status}`;
        continue;
      }

      const parts = payload.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        const data = part.inlineData?.data || part.inline_data?.data;
        const mime =
          part.inlineData?.mimeType || part.inline_data?.mime_type || "image/png";
        if (!data) continue;
        const buffer = Buffer.from(data, "base64");
        if (buffer.byteLength < 1_000) continue;
        const ext = mime.includes("jpeg") || mime.includes("jpg")
          ? "jpg"
          : mime.includes("webp")
            ? "webp"
            : "png";
        const stored = await storeGeneratedImage({
          buffer,
          contentType: mime.startsWith("image/") ? mime : "image/png",
          fileName: `ai-inline-${randomUUID().slice(0, 8)}.${ext}`,
          alt,
          uploadedBy: options.uploadedBy,
          source: "ai-editor-image",
        });
        return { url: stored.url, mediaId: stored.mediaId, alt };
      }
      lastError = `Model ${model} returned no image data.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Image generation failed.";
    }
  }

  return { error: lastError || "AI image generation failed." };
}

async function generateWithGemini(options: {
  topic: string;
  title: string;
  excerpt: string;
  category?: string;
  uploadedBy: string;
}): Promise<FeaturedImageResult | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) return null;

  const prompt = `Create a single high-quality editorial blog hero image for fikraInAction, a practical technology publication.
Topic: ${options.topic}
Article title: ${options.title}
Summary: ${options.excerpt}
Category: ${options.category || "Technology"}
Style: modern, clean, cinematic lighting, abstract tech photography or illustration, no logos of real brands unless essential, no watermarks, no UI mockups with fake text, no readable tiny text, 16:9 wide composition suitable as a blog thumbnail.`;

  let lastError = "";
  for (const model of imageModels()) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 0.8,
          },
        }),
        signal: AbortSignal.timeout(45_000),
      });
      const payload = (await response.json()) as {
        error?: { message?: string };
        candidates?: Array<{
          content?: {
            parts?: Array<{
              inlineData?: { mimeType?: string; data?: string };
              inline_data?: { mime_type?: string; data?: string };
            }>;
          };
        }>;
      };
      if (!response.ok) {
        lastError = payload.error?.message || `HTTP ${response.status}`;
        continue;
      }

      const parts = payload.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        const data = part.inlineData?.data || part.inline_data?.data;
        const mime =
          part.inlineData?.mimeType || part.inline_data?.mime_type || "image/png";
        if (!data) continue;
        const buffer = Buffer.from(data, "base64");
        if (buffer.byteLength < 1_000) continue;
        const ext = mime.includes("jpeg") || mime.includes("jpg")
          ? "jpg"
          : mime.includes("webp")
            ? "webp"
            : "png";
        const alt = options.title || options.topic;
        const stored = await storeGeneratedImage({
          buffer,
          contentType: mime.startsWith("image/") ? mime : "image/png",
          fileName: `ai-hero-${randomUUID().slice(0, 8)}.${ext}`,
          alt,
          uploadedBy: options.uploadedBy,
          source: "ai-featured-image",
        });
        return {
          thumbnailUrl: stored.url,
          thumbnailMediaId: stored.mediaId,
          thumbnailAlt: alt,
          source: "gemini",
        };
      }
      lastError = `Model ${model} returned no image data.`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Image generation failed.";
    }
  }

  return {
    source: "none",
    warning: lastError
      ? `AI image generation failed (${lastError}); add a featured image from the Media Library before publishing.`
      : "AI image generation failed; add a featured image from the Media Library before publishing.",
  };
}

/**
 * Resolve a featured image for an AI draft:
 * 1) scrape OG/screenshot from a product/official URL when available
 * 2) otherwise generate one with Gemini image models and store it in Media
 */
export async function resolveAiFeaturedImage(options: {
  topic: string;
  title: string;
  excerpt: string;
  category?: string;
  productName?: string;
  imageSourceUrl?: string;
  uploadedBy: string;
}): Promise<FeaturedImageResult> {
  if (options.imageSourceUrl) {
    try {
      const images = await discoverProductImages({
        name: options.productName || options.topic,
        type: "Article",
        category: options.category || "General",
        description: options.excerpt,
        officialUrl: options.imageSourceUrl,
        affiliateUrl: options.imageSourceUrl,
        audience: "General readers",
        features: "",
        pricing: "",
        pageType: "Blog post",
      });
      if (images[0]?.url) {
        return {
          thumbnailUrl: images[0].url,
          thumbnailAlt: images[0].alt || options.title,
          source: "microlink",
        };
      }
    } catch {
      // Fall through to Gemini generation.
    }
  }

  const generated = await generateWithGemini(options);
  if (generated?.thumbnailUrl) return generated;

  return {
    source: "none",
    warning:
      generated?.warning ||
      "No featured image could be discovered or generated automatically; add one from the Media Library before publishing.",
  };
}
