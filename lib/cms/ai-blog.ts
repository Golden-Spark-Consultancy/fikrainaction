import { randomUUID } from "node:crypto";
import { getAdminFirestore } from "../firebase/admin";
import { findYouTubeVideos, readOfficialPage } from "../ai-landing-page";
import { discoverProductImages } from "../image-discovery";
import type {
  AffiliateLinkDoc,
  AiBatch,
  AiBatchItem,
  AiBatchStatus,
  CategoryDoc,
  Locale,
  PostShared,
  TagDoc,
} from "../types/cms";
import { LOCALES } from "../types/cms";
import { COLLECTIONS } from "./collections";
import { upsertPostLocale } from "./posts";
import { slugify } from "./slug";

export class AiGenerationBackendError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
    this.name = "AiGenerationBackendError";
  }
}

export const DEFAULT_MAX_POSTS = 10;
export const HARD_MAX_POSTS = 25;

type AdminFirestore = Awaited<ReturnType<typeof getAdminFirestore>>;

type SourceEntry = { title: string; publisher?: string; url: string; accessedAt: string };

type LocaleOutline = {
  title: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  sections: { heading: string; paragraphs: string[] }[];
  table?: { headers: string[]; rows: string[][] };
  faq?: { question: string; answer: string }[];
};

type TopicOutline = {
  categoryGuess: string;
  tags: string[];
  recommendedProductName?: string;
  recommendedProductUrl?: string;
  locales: Partial<Record<Locale, LocaleOutline>>;
};

export type GenerateBlogOptions = {
  language: "ar" | "en" | "both";
  style?: string;
  audience?: string;
  length: "short" | "medium" | "long";
  includeRecommendations: boolean;
  createdBy: string;
  batchId?: string;
  /** Reuse an existing post id, e.g. when retrying a failed batch item. */
  postId?: string;
};

export type GenerateBlogResult = {
  postId: string;
  warnings: string[];
  sources: SourceEntry[];
  researchStatus: "researched" | "skipped" | "failed";
};

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const result = {} as T;
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

function extractUrl(topic: string): string | null {
  const match = topic.match(/https?:\/\/[^\s)]+/i);
  if (!match) return null;
  try {
    return new URL(match[0].replace(/[.,;:!?)]+$/, "")).toString();
  } catch {
    return null;
  }
}

function safeHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/* ------------------------------------------------------------------------ *
 * TipTap document assembly
 * ------------------------------------------------------------------------ */

type TipTapNode = Record<string, unknown>;

function textNode(text: string): TipTapNode {
  return { type: "text", text };
}

function paragraph(text: string): TipTapNode {
  return { type: "paragraph", content: text.trim() ? [textNode(text)] : [] };
}

function heading(level: number, text: string): TipTapNode {
  return { type: "heading", attrs: { level }, content: text.trim() ? [textNode(text)] : [] };
}

function tableNode(table: { headers: string[]; rows: string[][] }): TipTapNode {
  return {
    type: "table",
    content: [
      {
        type: "tableRow",
        content: table.headers.map((cell) => ({ type: "tableHeader", content: [paragraph(cell)] })),
      },
      ...table.rows.map((row) => ({
        type: "tableRow",
        content: row.map((cell) => ({ type: "tableCell", content: [paragraph(cell)] })),
      })),
    ],
  };
}

function sourceParagraph(source: SourceEntry): TipTapNode {
  const content: TipTapNode[] = [
    { type: "text", text: source.title, marks: [{ type: "link", attrs: { href: source.url } }] },
  ];
  if (source.publisher) content.push(textNode(` — ${source.publisher}`));
  return { type: "paragraph", content };
}

function buildTiptapDoc(
  outline: LocaleOutline,
  options: {
    locale: Locale;
    sources: SourceEntry[];
    youtube?: { url: string; src: string };
    recommendation?: { href: string; label: string } | null;
  },
): Record<string, unknown> {
  const isAr = options.locale === "ar";
  const content: TipTapNode[] = [];
  if (outline.excerpt) content.push(paragraph(outline.excerpt));

  for (const section of outline.sections) {
    if (section.heading) content.push(heading(2, section.heading));
    for (const para of section.paragraphs) {
      if (para.trim()) content.push(paragraph(para));
    }
  }

  if (outline.table?.headers.length && outline.table.rows.length) {
    content.push(heading(2, isAr ? "جدول مقارنة" : "Comparison table"));
    content.push(tableNode(outline.table));
  }

  if (outline.faq?.length) {
    content.push(heading(2, isAr ? "أسئلة شائعة" : "Frequently asked questions"));
    for (const item of outline.faq) {
      content.push(heading(3, item.question));
      content.push(paragraph(item.answer));
    }
  }

  if (options.youtube) {
    content.push(heading(2, isAr ? "فيديو ذو صلة" : "Related video"));
    content.push({ type: "youtube", attrs: { url: options.youtube.url, src: options.youtube.src } });
  }

  if (options.recommendation) {
    content.push({ type: "button", attrs: { href: options.recommendation.href, label: options.recommendation.label } });
  }

  if (options.sources.length) {
    content.push({
      type: "callout",
      attrs: { variant: "info" },
      content: [heading(3, isAr ? "المصادر" : "Sources"), ...options.sources.map(sourceParagraph)],
    });
  }

  if (!content.length) content.push(paragraph(""));
  return { type: "doc", content };
}

/* ------------------------------------------------------------------------ *
 * Outline generation (Gemini, with an offline fallback)
 * ------------------------------------------------------------------------ */

function buildFallbackOutline(topic: string, locales: Locale[]): TopicOutline {
  const outline: TopicOutline = { categoryGuess: "", tags: [], locales: {} };
  for (const locale of locales) {
    const isAr = locale === "ar";
    outline.locales[locale] = {
      title: topic,
      excerpt: isAr
        ? `مسودة أولية تحتاج إلى بحث وتحرير حول: ${topic}`
        : `Placeholder draft that needs research and editing about: ${topic}`,
      seoTitle: topic,
      seoDescription: isAr
        ? `مسودة أولية عن "${topic}"، بانتظار البحث والمراجعة التحريرية قبل النشر.`
        : `Initial outline about "${topic}", pending research and editorial review before publishing.`,
      sections: [
        {
          heading: isAr ? "نظرة عامة (تحتاج بحث)" : "Overview (needs research)",
          paragraphs: [
            isAr
              ? "تم إنشاء هذه المسودة بدون بحث آلي لأن مفتاح Gemini API غير مُهيأ على الخادم. أضف بحثًا حقيقيًا ومحتوى فعليًا قبل النشر."
              : "This draft was generated without automated research because no Gemini API key is configured on the server. Add real research and content before publishing.",
          ],
        },
      ],
      faq: [],
    };
  }
  return outline;
}

function toLocaleOutline(raw: unknown): LocaleOutline | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  if (!String(value.title || "").trim() && !String(value.excerpt || "").trim()) return null;

  const headers = Array.isArray(value.tableHeaders) ? (value.tableHeaders as unknown[]).map(String).filter(Boolean) : [];
  const rows = Array.isArray(value.tableRows)
    ? (value.tableRows as unknown[]).map((row) => (Array.isArray(row) ? row.map(String) : []))
    : [];

  const sections = Array.isArray(value.sections)
    ? (value.sections as { heading?: unknown; paragraphs?: unknown }[])
        .map((section) => ({
          heading: String(section.heading || ""),
          paragraphs: Array.isArray(section.paragraphs) ? section.paragraphs.map(String).filter(Boolean) : [],
        }))
        .filter((section) => section.heading || section.paragraphs.length)
    : [];

  const faq = Array.isArray(value.faq)
    ? (value.faq as { question?: unknown; answer?: unknown }[])
        .map((item) => ({ question: String(item.question || ""), answer: String(item.answer || "") }))
        .filter((item) => item.question && item.answer)
    : [];

  return {
    title: String(value.title || ""),
    excerpt: String(value.excerpt || ""),
    seoTitle: String(value.seoTitle || value.title || ""),
    seoDescription: String(value.seoDescription || value.excerpt || ""),
    sections,
    table: headers.length && rows.length ? { headers, rows } : undefined,
    faq,
  };
}

const LENGTH_WORD_TARGETS: Record<GenerateBlogOptions["length"], string> = {
  short: "500-700",
  medium: "900-1300",
  long: "1600-2200",
};

async function callGeminiForBlogOutline(
  topic: string,
  research: { title: string; text: string } | null,
  options: GenerateBlogOptions,
  locales: Locale[],
): Promise<TopicOutline> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured.");

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const lengthWords = LENGTH_WORD_TARGETS[options.length] || LENGTH_WORD_TARGETS.medium;
  const langNote =
    locales.length > 1
      ? 'Provide complete, well-developed content for BOTH the "ar" (Arabic) and "en" (English) fields — write independent, natural translations, not literal word-for-word copies.'
      : `Provide complete, well-developed content ONLY for the "${locales[0]}" field. Leave the other language's title/excerpt/seoTitle/seoDescription fields as empty strings and its sections/faq as empty arrays.`;

  const researchNote = research
    ? `Ground the article in this fetched source and do not contradict it. Do not invent facts, prices, or statistics beyond it.\nSource title: ${research.title}\nSource text: ${research.text.slice(0, 12_000)}`
    : "No official source page was fetched for this topic. Write from well-established general knowledge, and avoid inventing specific prices, statistics, or unverifiable claims.";

  const recommendationNote = options.includeRecommendations
    ? "You may reference at most one real, well-known official product or service that is genuinely relevant to the topic, together with its official website URL only (never fabricate a URL, and never invent or use an affiliate/shortened link). Leave recommendedProductName and recommendedProductUrl empty if nothing is genuinely relevant."
    : "Do not name or recommend any specific commercial product or service; keep the article vendor-neutral. Leave recommendedProductName and recommendedProductUrl empty.";

  const prompt = `You are a senior bilingual editor for "Fikra in Action", an independent, practical technology and productivity blog. Write an original, useful, factually careful blog post outline about this topic.

Topic: ${topic}
Writing style: ${options.style || "practical and clear"}
Target audience: ${options.audience || "general tech-savvy readers"}
Target length: about ${lengthWords} words per requested language, split across 4-7 sections with short paragraphs (2-4 sentences each).
${langNote}
${researchNote}
${recommendationNote}

Also suggest a single best-fitting content category name and 3-6 relevant topical tags (in English, lowercase, short phrases). Add an optional short comparison/data table ONLY if genuinely useful for this topic (otherwise leave tableHeaders/tableRows empty), and 3-5 practical FAQ entries. Never fabricate sources, prices, or specs.`;

  const outlineSchema = {
    type: "object",
    properties: {
      title: { type: "string" },
      excerpt: { type: "string" },
      seoTitle: { type: "string" },
      seoDescription: { type: "string" },
      sections: {
        type: "array",
        items: {
          type: "object",
          properties: { heading: { type: "string" }, paragraphs: { type: "array", items: { type: "string" } } },
          required: ["heading", "paragraphs"],
        },
      },
      tableHeaders: { type: "array", items: { type: "string" } },
      tableRows: { type: "array", items: { type: "array", items: { type: "string" } } },
      faq: {
        type: "array",
        items: {
          type: "object",
          properties: { question: { type: "string" }, answer: { type: "string" } },
          required: ["question", "answer"],
        },
      },
    },
    required: ["title", "excerpt", "seoTitle", "seoDescription", "sections"],
  };

  const responseSchema = {
    type: "object",
    properties: {
      category: { type: "string" },
      tags: { type: "array", items: { type: "string" } },
      recommendedProductName: { type: "string" },
      recommendedProductUrl: { type: "string" },
      ar: outlineSchema,
      en: outlineSchema,
    },
    required: ["category", "tags", "ar", "en"],
  };

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema, temperature: 0.4, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(55_000),
      cache: "no-store",
    });
  } catch {
    throw new Error("Gemini did not respond in time. Please try generating this topic again.");
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("Gemini rejected the server API key. Check the GEMINI_API_KEY secret and redeploy.");
    }
    if (response.status === 429) throw new Error("The Gemini quota is currently exhausted. Please try again later.");
    if (response.status === 404) {
      throw new Error(`The configured Gemini model (${model}) is unavailable for this API key. Set GEMINI_MODEL to a supported model.`);
    }
    throw new Error(`Gemini could not generate the outline (service response ${response.status}). Please try again.`);
  }

  const payload = (await response.json()) as {
    candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  };
  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("");
  if (!text) throw new Error("Gemini returned an empty outline. Please try again.");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "")) as Record<string, unknown>;
  } catch {
    throw new Error("Gemini returned an incomplete outline. Please run the generation again.");
  }

  const localeOutlines: Partial<Record<Locale, LocaleOutline>> = {};
  const arOutline = toLocaleOutline(parsed.ar);
  const enOutline = toLocaleOutline(parsed.en);
  if (arOutline) localeOutlines.ar = arOutline;
  if (enOutline) localeOutlines.en = enOutline;

  return {
    categoryGuess: String(parsed.category || ""),
    tags: Array.isArray(parsed.tags) ? (parsed.tags as unknown[]).map(String).filter(Boolean) : [],
    recommendedProductName: parsed.recommendedProductName ? String(parsed.recommendedProductName) : undefined,
    recommendedProductUrl: parsed.recommendedProductUrl ? String(parsed.recommendedProductUrl) : undefined,
    locales: localeOutlines,
  };
}

/* ------------------------------------------------------------------------ *
 * Category / tag / affiliate matching
 * ------------------------------------------------------------------------ */

async function matchCategory(
  db: AdminFirestore,
  categoryGuess: string,
  topic: string,
): Promise<{ categoryId?: string; suggestedCategory?: string }> {
  const candidates = [categoryGuess, topic].map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!candidates.length) return {};

  const snap = await db.collection(COLLECTIONS.categories).limit(200).get().catch(() => null);
  for (const doc of snap?.docs ?? []) {
    const data = doc.data() as CategoryDoc;
    for (const locale of LOCALES) {
      const name = data.locales?.[locale]?.name?.trim().toLowerCase();
      if (!name) continue;
      if (candidates.some((candidate) => candidate === name || candidate.includes(name) || name.includes(candidate))) {
        return { categoryId: doc.id };
      }
    }
  }
  return { suggestedCategory: categoryGuess || topic };
}

async function resolveTagIds(db: AdminFirestore, tagNames: string[], locale: Locale): Promise<string[]> {
  const ids: string[] = [];
  for (const rawName of tagNames.slice(0, 6)) {
    const name = rawName.trim();
    if (!name) continue;
    const slug = slugify(name, locale);
    if (!slug) continue;
    try {
      const existing = await db
        .collection(COLLECTIONS.tags)
        .where(`locales.${locale}.slug`, "==", slug)
        .limit(1)
        .get();
      if (!existing.empty) {
        ids.push(existing.docs[0].id);
        continue;
      }
      const id = randomUUID();
      const now = new Date().toISOString();
      const tag: TagDoc = { id, locales: { [locale]: { name, slug } }, createdAt: now, updatedAt: now };
      await db.collection(COLLECTIONS.tags).doc(id).set(tag);
      ids.push(id);
    } catch {
      // Tag lookup/creation is best-effort; skip this tag rather than fail the whole draft.
    }
  }
  return [...new Set(ids)];
}

async function matchAffiliateLink(
  db: AdminFirestore,
  name?: string,
): Promise<{ href: string; label: string } | null> {
  const cleaned = name?.trim().toLowerCase();
  if (!cleaned) return null;
  const snap = await db.collection(COLLECTIONS.affiliateLinks).where("active", "==", true).limit(300).get().catch(() => null);
  for (const doc of snap?.docs ?? []) {
    const data = doc.data() as AffiliateLinkDoc;
    const shortCode = (data.shortCode || doc.id).toLowerCase();
    const linkName = (data.name || "").toLowerCase();
    if (shortCode === cleaned || (linkName && (linkName === cleaned || linkName.includes(cleaned) || cleaned.includes(linkName)))) {
      return { href: `/go/${data.shortCode || doc.id}`, label: data.name || name || shortCode };
    }
  }
  return null;
}

/* ------------------------------------------------------------------------ *
 * Draft generation
 * ------------------------------------------------------------------------ */

export async function generateBlogDraftForTopic(topic: string, options: GenerateBlogOptions): Promise<GenerateBlogResult> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) throw new AiGenerationBackendError("Topic is required.", 400);

  const db = await getAdminFirestore();
  const warnings: string[] = [];
  const sources: SourceEntry[] = [];
  let researchStatus: GenerateBlogResult["researchStatus"] = "skipped";
  let research: { title: string; text: string } | null = null;

  const officialUrl = extractUrl(cleanTopic);
  if (officialUrl) {
    try {
      research = await readOfficialPage(officialUrl);
      researchStatus = "researched";
      sources.push({ title: research.title, publisher: safeHostname(officialUrl), url: officialUrl, accessedAt: new Date().toISOString() });
    } catch {
      researchStatus = "failed";
      warnings.push("Automated research of the linked page failed; content is based on general knowledge only.");
    }
  }

  const locales: Locale[] = options.language === "both" ? ["ar", "en"] : [options.language];
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENAI_API_KEY;

  let outline: TopicOutline;
  if (apiKey) {
    try {
      outline = await callGeminiForBlogOutline(cleanTopic, research, options, locales);
    } catch (error) {
      warnings.push(
        error instanceof Error
          ? `AI generation failed (${error.message}); a placeholder outline was created instead.`
          : "AI generation failed; a placeholder outline was created instead.",
      );
      outline = buildFallbackOutline(cleanTopic, locales);
    }
  } else {
    outline = buildFallbackOutline(cleanTopic, locales);
    warnings.push(
      "No Gemini API key is configured (GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY); a placeholder outline was created for manual research.",
    );
  }

  const { categoryId, suggestedCategory } = await matchCategory(db, outline.categoryGuess, cleanTopic);
  const primaryLocale = locales[0];
  const primaryOutline = outline.locales[primaryLocale] ?? buildFallbackOutline(cleanTopic, [primaryLocale]).locales[primaryLocale]!;
  const tagIds = await resolveTagIds(db, outline.tags, primaryLocale);

  const matchedAffiliateLink = options.includeRecommendations
    ? await matchAffiliateLink(db, outline.recommendedProductName)
    : null;
  if (options.includeRecommendations && outline.recommendedProductName && !matchedAffiliateLink) {
    warnings.push(
      outline.recommendedProductUrl
        ? `No affiliate link is registered for "${outline.recommendedProductName}"; linking to its official website instead.`
        : `No affiliate link is registered for "${outline.recommendedProductName}"; no destination link was added.`,
    );
  }
  const recommendationLink =
    matchedAffiliateLink ??
    (outline.recommendedProductUrl
      ? { href: outline.recommendedProductUrl, label: outline.recommendedProductName || outline.recommendedProductUrl }
      : null);

  let missingFeaturedImage = true;
  let thumbnailUrl: string | undefined;
  const imageSourceUrl = officialUrl || outline.recommendedProductUrl;
  if (imageSourceUrl) {
    try {
      const images = await discoverProductImages({
        name: outline.recommendedProductName || cleanTopic,
        type: "Article",
        category: outline.categoryGuess || "General",
        description: primaryOutline.excerpt,
        officialUrl: imageSourceUrl,
        affiliateUrl: imageSourceUrl,
        audience: options.audience || "General readers",
        features: "",
        pricing: "",
        pageType: "Blog post",
      });
      if (images[0]) {
        thumbnailUrl = images[0].url;
        missingFeaturedImage = false;
      }
    } catch {
      // Featured image discovery is best-effort.
    }
  }
  if (missingFeaturedImage) {
    warnings.push("No featured image could be discovered automatically; add one from the Media Library before publishing.");
  }

  let youtube: { url: string; src: string } | undefined;
  try {
    const videos = await findYouTubeVideos(cleanTopic);
    if (videos[0]) youtube = { url: `https://www.youtube.com/watch?v=${videos[0].id}`, src: videos[0].embedUrl };
  } catch {
    // Video discovery is best-effort.
  }

  // One shared postId links AR + EN locales together for language switching.
  const postId = options.postId || randomUUID();
  const sharedFields: Omit<PostShared, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & { updatedBy: string } = {
    authorId: options.createdBy,
    categoryIds: categoryId ? [categoryId] : [],
    tagIds,
    featured: false,
    commentsEnabled: true,
    isAffiliateContent: Boolean(recommendationLink),
    relatedPostIds: [],
    sources,
    thumbnailUrl,
    aiGenerated: true,
    aiBatchId: options.batchId,
    aiWarnings: warnings,
    suggestedCategory,
    missingFeaturedImage,
    updatedBy: options.createdBy,
  };

  const shortId = postId.replace(/-/g, "").slice(0, 8);
  // Prefer a shared Latin slug so AR/EN stay easy to pair; still unique per post.
  const sharedSlugBase =
    slugify(outline.locales.en?.title || cleanTopic, "en") ||
    slugify(outline.locales.ar?.title || cleanTopic, "ar") ||
    "post";
  const sharedSlug = `${sharedSlugBase}-${shortId}`.slice(0, 180);

  for (const locale of locales) {
    const localeOutline = outline.locales[locale] ?? buildFallbackOutline(cleanTopic, [locale]).locales[locale]!;
    const content = buildTiptapDoc(localeOutline, { locale, sources, youtube, recommendation: recommendationLink });

    try {
      await upsertPostLocale({
        postId,
        shared: sharedFields,
        locale: {
          locale,
          title: localeOutline.title || cleanTopic,
          slug: sharedSlug,
          excerpt: localeOutline.excerpt,
          content,
          seo: { title: localeOutline.seoTitle, description: localeOutline.seoDescription },
          status: "draft",
          publishedAt: null,
          scheduledAt: null,
          lastReviewedAt: null,
          updatedBy: options.createdBy,
        },
      });
    } catch (error) {
      // Retry once with a fully unique shared slug if reservation still collides.
      const retrySlug = `post-${shortId}-${randomUUID().slice(0, 6)}`;
      if (!(error instanceof Error) || !/slug/i.test(error.message)) throw error;
      await upsertPostLocale({
        postId,
        shared: sharedFields,
        locale: {
          locale,
          title: localeOutline.title || cleanTopic,
          slug: retrySlug,
          excerpt: localeOutline.excerpt,
          content,
          seo: { title: localeOutline.seoTitle, description: localeOutline.seoDescription },
          status: "draft",
          publishedAt: null,
          scheduledAt: null,
          lastReviewedAt: null,
          updatedBy: options.createdBy,
        },
      });
      warnings.push(`Slug conflict resolved for ${locale}; used ${retrySlug}.`);
    }
  }

  return { postId, warnings, sources, researchStatus };
}

/* ------------------------------------------------------------------------ *
 * Batch orchestration
 * ------------------------------------------------------------------------ */

export type CreateAiBatchInput = {
  topics: string[];
  language: "ar" | "en" | "both";
  style?: string;
  audience?: string;
  length?: "short" | "medium" | "long";
  includeRecommendations?: boolean;
  maxPosts?: number;
  createdBy: string;
};

export async function createAiBatch(input: CreateAiBatchInput): Promise<{ batch: AiBatch; items: AiBatchItem[] }> {
  const maxPosts = Math.min(HARD_MAX_POSTS, Math.max(1, input.maxPosts || DEFAULT_MAX_POSTS));
  const topics = [...new Set(input.topics.map((topic) => topic.trim()).filter(Boolean))].slice(0, maxPosts);
  if (!topics.length) throw new AiGenerationBackendError("At least one topic is required.", 400);

  const db = await getAdminFirestore();
  const now = new Date().toISOString();
  const batchId = randomUUID();

  const batch: AiBatch = {
    id: batchId,
    topics,
    language: input.language,
    style: input.style || "practical",
    audience: input.audience || "general readers",
    length: input.length || "medium",
    includeRecommendations: Boolean(input.includeRecommendations),
    maxPosts,
    status: "queued",
    createdAt: now,
    updatedAt: now,
    createdBy: input.createdBy,
    completedCount: 0,
    failedCount: 0,
    totalCount: topics.length,
  };

  const items: AiBatchItem[] = topics.map((topic) => ({
    id: randomUUID(),
    batchId,
    topic,
    status: "queued",
    createdAt: now,
    updatedAt: now,
  }));

  const writeBatch = db.batch();
  writeBatch.set(db.collection(COLLECTIONS.aiBatches).doc(batchId), batch);
  for (const item of items) {
    writeBatch.set(db.collection(COLLECTIONS.aiBatchItems).doc(item.id), item);
  }
  await writeBatch.commit();

  return { batch, items };
}

export async function listAiBatches(limit = 50): Promise<AiBatch[]> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.aiBatches).orderBy("createdAt", "desc").limit(limit).get().catch(() => null);
  return (snap?.docs ?? []).map((doc) => doc.data() as AiBatch);
}

export async function getAiBatch(batchId: string): Promise<{ batch: AiBatch; items: AiBatchItem[] } | null> {
  const db = await getAdminFirestore();
  const batchSnap = await db.collection(COLLECTIONS.aiBatches).doc(batchId).get();
  if (!batchSnap.exists) return null;
  const itemsSnap = await db.collection(COLLECTIONS.aiBatchItems).where("batchId", "==", batchId).get().catch(() => null);
  const items = (itemsSnap?.docs ?? [])
    .map((doc) => doc.data() as AiBatchItem)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return { batch: batchSnap.data() as AiBatch, items };
}

export async function cancelAiBatch(batchId: string): Promise<AiBatch> {
  const db = await getAdminFirestore();
  const batchRef = db.collection(COLLECTIONS.aiBatches).doc(batchId);
  const snap = await batchRef.get();
  if (!snap.exists) throw new AiGenerationBackendError("Batch not found.", 404);

  const now = new Date().toISOString();
  const itemsSnap = await db.collection(COLLECTIONS.aiBatchItems).where("batchId", "==", batchId).get();
  const writeBatch = db.batch();
  for (const doc of itemsSnap.docs) {
    const status = (doc.data() as AiBatchItem).status;
    if (status === "queued" || status === "researching" || status === "generating") {
      writeBatch.update(doc.ref, { status: "cancelled", updatedAt: now });
    }
  }
  writeBatch.update(batchRef, { status: "cancelled", updatedAt: now });
  await writeBatch.commit();

  return { ...(snap.data() as AiBatch), status: "cancelled", updatedAt: now };
}

export async function retryAiBatchItem(batchId: string, itemId: string): Promise<AiBatchItem> {
  const db = await getAdminFirestore();
  const itemRef = db.collection(COLLECTIONS.aiBatchItems).doc(itemId);
  const snap = await itemRef.get();
  if (!snap.exists || (snap.data() as AiBatchItem).batchId !== batchId) {
    throw new AiGenerationBackendError("Batch item not found.", 404);
  }

  const now = new Date().toISOString();
  const { FieldValue } = await import("firebase-admin/firestore");
  await itemRef.set({ status: "queued", updatedAt: now, error: FieldValue.delete() }, { merge: true });

  const batchRef = db.collection(COLLECTIONS.aiBatches).doc(batchId);
  await batchRef
    .set({ status: "queued", updatedAt: now }, { merge: true })
    .catch(() => undefined);

  const updated = await itemRef.get();
  return updated.data() as AiBatchItem;
}

/** Processes up to `count` queued items for a batch. Safe to call repeatedly (idempotent, rate-limit friendly). */
export async function processNextAiItem(
  batchId: string,
  options: { count?: number } = {},
): Promise<{ processed: AiBatchItem[]; batch: AiBatch }> {
  const db = await getAdminFirestore();
  const batchRef = db.collection(COLLECTIONS.aiBatches).doc(batchId);
  const batchSnap = await batchRef.get();
  if (!batchSnap.exists) throw new AiGenerationBackendError("Batch not found.", 404);
  let batch = batchSnap.data() as AiBatch;

  if (batch.status === "cancelled" || batch.status === "completed") {
    return { processed: [], batch };
  }

  const count = Math.max(1, Math.min(5, options.count ?? 1));
  const queuedSnap = await db
    .collection(COLLECTIONS.aiBatchItems)
    .where("batchId", "==", batchId)
    .where("status", "==", "queued")
    .limit(count)
    .get();

  const processed: AiBatchItem[] = [];
  for (const doc of queuedSnap.docs) {
    const item = doc.data() as AiBatchItem;
    const freshSnap = await doc.ref.get();
    const fresh = freshSnap.data() as AiBatchItem;
    if (fresh.status !== "queued") {
      processed.push(fresh);
      continue;
    }

    await doc.ref.set({ status: "researching", updatedAt: new Date().toISOString() }, { merge: true });
    try {
      const result = await generateBlogDraftForTopic(item.topic, {
        language: batch.language,
        style: batch.style,
        audience: batch.audience,
        length: batch.length,
        includeRecommendations: batch.includeRecommendations,
        createdBy: batch.createdBy,
        batchId,
        // Reuse postId on retry so AR/EN stay on the same linked post.
        postId: item.postId || undefined,
      });
      const completedAt = new Date().toISOString();
      const updatedItem: AiBatchItem = {
        ...item,
        status: "completed",
        postId: result.postId,
        locale: batch.language === "en" ? "en" : "ar",
        sources: result.sources,
        warnings: result.warnings,
        featuredImageStatus: result.warnings.some((warning) =>
          warning.toLowerCase().includes("featured image"),
        )
          ? "missing"
          : "ready",
        languageStatus:
          batch.language === "both" ? "both" : result.researchStatus,
        updatedAt: completedAt,
      };
      await doc.ref.set(stripUndefined(updatedItem as unknown as Record<string, unknown>), {
        merge: true,
      });
      processed.push(updatedItem);
    } catch (error) {
      const failedAt = new Date().toISOString();
      const updatedItem: AiBatchItem = {
        ...item,
        status: "failed",
        error: error instanceof Error ? error.message : "Generation failed.",
        updatedAt: failedAt,
      };
      await doc.ref.set(stripUndefined(updatedItem as unknown as Record<string, unknown>), {
        merge: true,
      });
      processed.push(updatedItem);
    }
  }

  const allItemsSnap = await db.collection(COLLECTIONS.aiBatchItems).where("batchId", "==", batchId).get();
  const allItems = allItemsSnap.docs.map((doc) => doc.data() as AiBatchItem);
  const completedCount = allItems.filter((entry) => entry.status === "completed").length;
  const failedCount = allItems.filter((entry) => entry.status === "failed").length;
  const cancelledCount = allItems.filter((entry) => entry.status === "cancelled").length;
  const finished = completedCount + failedCount + cancelledCount >= allItems.length;
  const nextStatus: AiBatchStatus = finished ? "completed" : "generating";

  const batchUpdate = {
    completedCount,
    failedCount,
    totalCount: allItems.length,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
  };
  await batchRef.set(batchUpdate, { merge: true });
  batch = { ...batch, ...batchUpdate };

  return { processed, batch };
}
