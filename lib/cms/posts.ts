import { getAdminFirestore } from "../firebase/admin";
import { normalizeArabicSearchText, readingTimeMinutes, type Locale } from "../i18n/config";
import { extractPlainText } from "../sanitize";
import { renderTiptapToHtml } from "../content/render-tiptap";
import type { ContentStatus, PostLocale, PostShared } from "../types/cms";
import { COLLECTIONS, LEGACY_COLLECTIONS } from "./collections";
import { reserveSlug } from "./slug";

function localeDocId(postId: string, locale: Locale) {
  return `${postId}_${locale}`;
}

/** Firestore rejects explicit `undefined` field values; drop them before writing. */
function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const result = {} as T;
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

function mapLegacyBlogPost(id: string, data: FirebaseFirestore.DocumentData, locale: Locale): { shared: PostShared; locale: PostLocale } {
  const html = String(data.html ?? "");
  const title = String(data.title ?? id);
  return {
    shared: {
      id,
      authorId: String(data.createdBy ?? "legacy"),
      categoryIds: data.category ? [String(data.category)] : [],
      tagIds: [],
      featured: false,
      commentsEnabled: true,
      isAffiliateContent: false,
      relatedPostIds: [],
      createdAt: String(data.createdAt?.toDate?.()?.toISOString?.() ?? data.createdAt ?? new Date().toISOString()),
      updatedAt: String(data.updatedAt?.toDate?.()?.toISOString?.() ?? data.updatedAt ?? new Date().toISOString()),
      createdBy: String(data.createdBy ?? "legacy"),
      updatedBy: String(data.updatedBy ?? data.createdBy ?? "legacy"),
    },
    locale: {
      id: localeDocId(id, locale),
      postId: id,
      locale,
      title,
      slug: String(data.slug ?? id),
      excerpt: String(data.excerpt ?? ""),
      content: null,
      renderedHtml: html,
      searchText: normalizeArabicSearchText(`${title} ${data.excerpt ?? ""} ${extractPlainText(html)}`),
      seo: { title: data.seoTitle, description: data.metaDescription },
      status: (data.status as ContentStatus) || "draft",
      publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() ?? data.publishedAt ?? null,
      scheduledAt: null,
      readingTimeMinutes: Number(data.readTime) || readingTimeMinutes(extractPlainText(html), locale),
      updatedAt: String(data.updatedAt?.toDate?.()?.toISOString?.() ?? new Date().toISOString()),
      updatedBy: String(data.updatedBy ?? "legacy"),
    },
  };
}

// Avoid importing firebase-admin types at module top for lighter builds.
declare namespace FirebaseFirestore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type DocumentData = Record<string, any>;
}

export async function getPost(postId: string): Promise<PostShared | null> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.posts).doc(postId).get();
  if (snap.exists) return { id: snap.id, ...(snap.data() as Omit<PostShared, "id">) };

  const legacy = await db.collection(LEGACY_COLLECTIONS.blogPosts).doc(postId).get();
  if (!legacy.exists) return null;
  return mapLegacyBlogPost(legacy.id, legacy.data() as FirebaseFirestore.DocumentData, "en").shared;
}

export async function getPostLocale(postId: string, locale: Locale): Promise<PostLocale | null> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.postLocales).doc(localeDocId(postId, locale)).get();
  if (snap.exists) return snap.data() as PostLocale;

  if (locale === "en") {
    const legacy = await db.collection(LEGACY_COLLECTIONS.blogPosts).doc(postId).get();
    if (legacy.exists) {
      return mapLegacyBlogPost(legacy.id, legacy.data() as FirebaseFirestore.DocumentData, "en").locale;
    }
  }
  return null;
}

export async function getPostBySlug(locale: Locale, slug: string): Promise<{ shared: PostShared; locale: PostLocale } | null> {
  const db = await getAdminFirestore();
  const query = await db
    .collection(COLLECTIONS.postLocales)
    .where("locale", "==", locale)
    .where("slug", "==", slug)
    .where("status", "==", "published")
    .limit(1)
    .get();

  if (!query.empty) {
    const localeDoc = query.docs[0].data() as PostLocale;
    const shared = await getPost(localeDoc.postId);
    if (!shared) return null;
    return { shared, locale: localeDoc };
  }

  if (locale === "en") {
    const legacy = await db.collection(LEGACY_COLLECTIONS.blogPosts).doc(slug).get();
    if (legacy.exists && legacy.data()?.status === "published") {
      return mapLegacyBlogPost(legacy.id, legacy.data() as FirebaseFirestore.DocumentData, "en");
    }
  }
  return null;
}

export async function listPublishedPosts(
  locale: Locale,
  options: { limit?: number; categoryId?: string } = {},
): Promise<PostLocale[]> {
  const limit = Math.min(options.limit ?? 12, 50);
  const db = await getAdminFirestore();

  try {
    let q = db
      .collection(COLLECTIONS.postLocales)
      .where("locale", "==", locale)
      .where("status", "==", "published")
      .orderBy("publishedAt", "desc")
      .limit(limit);
    const snap = await q.get();
    if (!snap.empty) return snap.docs.map((d) => d.data() as PostLocale);
  } catch {
    /* fall back to legacy */
  }

  if (locale !== "en") return [];

  try {
    const legacy = await db
      .collection(LEGACY_COLLECTIONS.blogPosts)
      .where("status", "==", "published")
      .limit(limit)
      .get();
    return legacy.docs.map(
      (d) => mapLegacyBlogPost(d.id, d.data() as FirebaseFirestore.DocumentData, "en").locale,
    );
  } catch {
    return [];
  }
}

export async function upsertPostLocale(input: {
  postId: string;
  shared: Omit<PostShared, "id" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"> & {
    createdBy?: string;
    updatedBy: string;
  };
  locale: Omit<PostLocale, "id" | "postId" | "searchText" | "renderedHtml" | "readingTimeMinutes" | "updatedAt"> & {
    renderedHtml?: string;
  };
}) {
  const db = await getAdminFirestore();
  const now = new Date().toISOString();
  const reservation = await reserveSlug({
    collection: COLLECTIONS.postLocales,
    documentId: localeDocId(input.postId, input.locale.locale),
    locale: input.locale.locale,
    slug: input.locale.slug,
  });
  if (!reservation.ok) throw new Error(reservation.reason);

  const renderedHtml =
    input.locale.renderedHtml ??
    renderTiptapToHtml(input.locale.content);
  const searchText = normalizeArabicSearchText(
    `${input.locale.title} ${input.locale.excerpt} ${extractPlainText(renderedHtml)}`,
  );
  const reading = readingTimeMinutes(extractPlainText(renderedHtml), input.locale.locale);

  const sharedRef = db.collection(COLLECTIONS.posts).doc(input.postId);
  const existing = await sharedRef.get();
  const existingShared = existing.exists ? (existing.data() as PostShared) : null;
  const sharedPayload: PostShared = {
    id: input.postId,
    authorId: input.shared.authorId,
    thumbnailMediaId: input.shared.thumbnailMediaId,
    thumbnailUrl: input.shared.thumbnailUrl ?? existingShared?.thumbnailUrl,
    categoryIds: input.shared.categoryIds,
    tagIds: input.shared.tagIds,
    featured: input.shared.featured,
    pinned: input.shared.pinned ?? existingShared?.pinned,
    homepagePlacement: input.shared.homepagePlacement ?? null,
    commentsEnabled: input.shared.commentsEnabled ?? null,
    isAffiliateContent: input.shared.isAffiliateContent,
    affiliateDisclosureOverride:
      input.shared.affiliateDisclosureOverride ?? existingShared?.affiliateDisclosureOverride,
    relatedPostIds: input.shared.relatedPostIds,
    sources: input.shared.sources ?? existingShared?.sources,
    canonicalUrl: input.shared.canonicalUrl ?? existingShared?.canonicalUrl,
    aiGenerated: input.shared.aiGenerated ?? existingShared?.aiGenerated,
    aiBatchId: input.shared.aiBatchId ?? existingShared?.aiBatchId,
    aiWarnings: input.shared.aiWarnings ?? existingShared?.aiWarnings,
    suggestedCategory: input.shared.suggestedCategory ?? existingShared?.suggestedCategory,
    missingFeaturedImage: input.shared.missingFeaturedImage ?? existingShared?.missingFeaturedImage,
    createdAt: existingShared ? String(existingShared.createdAt) : now,
    updatedAt: now,
    createdBy: existingShared ? String(existingShared.createdBy) : input.shared.updatedBy,
    updatedBy: input.shared.updatedBy,
  };

  const localePayload: PostLocale = {
    id: localeDocId(input.postId, input.locale.locale),
    postId: input.postId,
    locale: input.locale.locale,
    title: input.locale.title,
    slug: input.locale.slug,
    excerpt: input.locale.excerpt,
    content: input.locale.content,
    renderedHtml,
    searchText,
    seo: input.locale.seo ?? {},
    thumbnailAlt: input.locale.thumbnailAlt,
    caption: input.locale.caption,
    status: input.locale.status,
    publishedAt: input.locale.publishedAt ?? null,
    scheduledAt: input.locale.scheduledAt ?? null,
    lastReviewedAt: input.locale.lastReviewedAt ?? null,
    readingTimeMinutes: reading,
    updatedAt: now,
    updatedBy: input.shared.updatedBy,
  };

  const batch = db.batch();
  batch.set(sharedRef, stripUndefined(sharedPayload), { merge: true });
  batch.set(
    db.collection(COLLECTIONS.postLocales).doc(localePayload.id),
    stripUndefined(localePayload),
    { merge: true },
  );
  batch.set(db.collection(COLLECTIONS.postRevisions).doc(), {
    postId: input.postId,
    locale: input.locale.locale,
    snapshot: localePayload,
    createdAt: now,
    createdBy: input.shared.updatedBy,
  });
  await batch.commit();
  return { shared: sharedPayload, locale: localePayload };
}
