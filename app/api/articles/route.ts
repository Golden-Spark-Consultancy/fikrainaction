import { createHash, randomUUID } from "node:crypto";
import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../lib/cms/collections";
import { upsertPostLocale } from "../../../lib/cms/posts";
import { renderTiptapToHtml } from "../../../lib/content/render-tiptap";
import type { Locale } from "../../../lib/i18n/config";
import type { ContentStatus, LocalizedString, SeoFields } from "../../../lib/types/cms";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FirebaseAccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
  return Response.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: 500 },
  );
}

function slugify(input: string, fallback: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 180) || fallback
  );
}

function parseSources(raw: unknown): PostSources | undefined {
  if (!raw) return undefined;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        if (!row.url) return null;
        return {
          title: String(row.title || row.url),
          publisher: row.publisher ? String(row.publisher) : undefined,
          url: String(row.url),
          accessedAt: String(row.accessedAt || new Date().toISOString()),
        };
      })
      .filter(Boolean) as PostSources;
  }
  if (typeof raw === "string") {
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((url) => ({
        title: url,
        url,
        accessedAt: new Date().toISOString(),
      }));
  }
  return undefined;
}

type PostSources = { title: string; publisher?: string; url: string; accessedAt: string }[];

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const db = await getAdminFirestore();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const locale = (url.searchParams.get("locale") || "ar") as Locale;
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const status = url.searchParams.get("status");
    const localeFilter = url.searchParams.get("filterLocale");
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") || 50)));

    if (id) {
      const shared = await db.collection(COLLECTIONS.posts).doc(id).get();
      const localeDoc = await db
        .collection(COLLECTIONS.postLocales)
        .doc(`${id}_${locale}`)
        .get();
      const revisions = await db
        .collection(COLLECTIONS.postRevisions)
        .where("postId", "==", id)
        .where("locale", "==", locale)
        .limit(30)
        .get()
        .catch(() => null);

      if (!shared.exists && !localeDoc.exists) {
        const legacy = await db.collection("blogPosts").doc(id).get();
        if (!legacy.exists) return Response.json({ error: "Not found" }, { status: 404 });
        const data = legacy.data() || {};
        return Response.json({
          article: {
            id,
            shared: {
              id,
              authorId: data.createdBy || "legacy",
              categoryIds: data.category ? [String(data.category)] : [],
              tagIds: [],
              featured: false,
              commentsEnabled: true,
              isAffiliateContent: false,
              relatedPostIds: [],
            },
            locale: {
              locale: "en",
              title: data.title || id,
              slug: data.slug || id,
              excerpt: data.excerpt || "",
              content: null,
              renderedHtml: data.html || "",
              status: data.status || "draft",
              seo: {},
            },
            revisions: [],
            legacy: true,
          },
        });
      }

      return Response.json({
        article: {
          id,
          shared: shared.exists ? { id, ...shared.data() } : null,
          locale: localeDoc.exists ? localeDoc.data() : null,
          revisions:
            revisions?.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .sort((a, b) =>
                String((b as { createdAt?: string }).createdAt || "").localeCompare(
                  String((a as { createdAt?: string }).createdAt || ""),
                ),
              ) ?? [],
        },
      });
    }

    let localesSnap = await db
      .collection(COLLECTIONS.postLocales)
      .orderBy("updatedAt", "desc")
      .limit(500)
      .get()
      .catch(() => null);

    // Fallback when orderBy fails (missing field/index) so AI drafts still appear.
    if (!localesSnap) {
      localesSnap = await db
        .collection(COLLECTIONS.postLocales)
        .limit(500)
        .get()
        .catch(() => null);
    }

    let articles = (localesSnap?.docs.map((d) => {
      const data = d.data();
      const docId = String(data.postId || d.id);
      return {
        id: docId.replace(/_(ar|en)$/i, ""),
        locale: data.locale,
        title: data.title || "Untitled",
        slug: data.slug || "",
        status: data.status || "draft",
        excerpt: data.excerpt,
        updatedAt: data.updatedAt,
        publishedAt: data.publishedAt,
        source: "postLocales",
      };
    }) ?? []) as Array<{
      id: string;
      locale: string;
      title: string;
      slug: string;
      status: string;
      excerpt?: string;
      updatedAt?: string;
      publishedAt?: string;
      source: string;
    }>;

    articles.sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    if (status) articles = articles.filter((a) => a.status === status);
    if (localeFilter) articles = articles.filter((a) => a.locale === localeFilter);
    if (q) {
      articles = articles.filter(
        (a) =>
          a.title?.toLowerCase().includes(q) ||
          a.slug?.toLowerCase().includes(q) ||
          a.excerpt?.toLowerCase().includes(q),
      );
    }

    const total = articles.length;
    const start = (page - 1) * pageSize;
    const paged = articles.slice(start, start + pageSize);

    return Response.json({ articles: paged, posts: paged, total, page, pageSize });
  } catch (error) {
    return errorResponse(error, "Unable to load posts");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "edit_own_content");
    const body = (await request.json()) as {
      postId?: string;
      locale: Locale;
      title: string;
      slug?: string;
      excerpt?: string;
      content?: Record<string, unknown> | null;
      renderedHtml?: string;
      status?: ContentStatus;
      scheduledAt?: string | null;
      publishedAt?: string | null;
      seo?: SeoFields;
      categoryIds?: string[];
      tagIds?: string[];
      featured?: boolean;
      pinned?: boolean;
      commentsEnabled?: boolean | null;
      isAffiliateContent?: boolean;
      affiliateDisclosureOverride?: LocalizedString;
      relatedPostIds?: string[];
      thumbnailMediaId?: string;
      thumbnailUrl?: string;
      thumbnailAlt?: string;
      caption?: string;
      canonicalUrl?: string;
      sources?: unknown;
      createRedirectFrom?: string;
      duplicateFrom?: { postId: string; locale: Locale };
      restoreRevisionId?: string;
    };

    if (body.duplicateFrom?.postId) {
      const db = await getAdminFirestore();
      const sourceId = body.duplicateFrom.postId;
      const sourceLocale = body.duplicateFrom.locale;
      const shared = await db.collection(COLLECTIONS.posts).doc(sourceId).get();
      const localeDoc = await db
        .collection(COLLECTIONS.postLocales)
        .doc(`${sourceId}_${sourceLocale}`)
        .get();
      if (!localeDoc.exists) {
        return Response.json({ error: "Source post not found" }, { status: 404 });
      }
      const localeData = localeDoc.data() || {};
      const sharedData = shared.data() || {};
      const newId = randomUUID();
      const result = await upsertPostLocale({
        postId: newId,
        shared: {
          authorId: auth.uid,
          thumbnailMediaId: sharedData.thumbnailMediaId as string | undefined,
          thumbnailUrl: sharedData.thumbnailUrl as string | undefined,
          categoryIds: (sharedData.categoryIds as string[]) || [],
          tagIds: (sharedData.tagIds as string[]) || [],
          featured: false,
          pinned: false,
          commentsEnabled: sharedData.commentsEnabled !== false,
          isAffiliateContent: Boolean(sharedData.isAffiliateContent),
          relatedPostIds: [],
          sources: sharedData.sources as PostSources | undefined,
          updatedBy: auth.email || auth.uid,
        },
        locale: {
          locale: sourceLocale,
          title: `${localeData.title || "Untitled"} (Copy)`,
          slug: slugify(`${localeData.slug || "post"}-copy-${createHash("sha1").update(newId).digest("hex").slice(0, 6)}`, newId),
          excerpt: String(localeData.excerpt || ""),
          content: (localeData.content as Record<string, unknown>) || null,
          renderedHtml: String(localeData.renderedHtml || ""),
          seo: (localeData.seo as SeoFields) || {},
          thumbnailAlt: localeData.thumbnailAlt as string | undefined,
          caption: localeData.caption as string | undefined,
          status: "draft",
          publishedAt: null,
          scheduledAt: null,
          lastReviewedAt: null,
          updatedBy: auth.email || auth.uid,
        },
      });
      await writeAuditLog({
        actorUid: auth.uid,
        actorEmail: auth.email,
        action: "post.duplicate",
        resourceType: "post",
        resourceId: newId,
        details: { from: sourceId },
      });
      return Response.json({ article: result }, { status: 201 });
    }

    if (body.restoreRevisionId) {
      const db = await getAdminFirestore();
      const rev = await db.collection(COLLECTIONS.postRevisions).doc(body.restoreRevisionId).get();
      if (!rev.exists) return Response.json({ error: "Revision not found" }, { status: 404 });
      const snapshot = (rev.data()?.snapshot || {}) as Record<string, unknown>;
      body.title = String(snapshot.title || body.title);
      body.slug = String(snapshot.slug || body.slug || "");
      body.excerpt = String(snapshot.excerpt || "");
      body.content = (snapshot.content as Record<string, unknown>) || null;
      body.seo = (snapshot.seo as SeoFields) || {};
      body.status = "draft";
    }

    if (!body.title?.trim() || !body.locale) {
      return Response.json({ error: "title and locale are required" }, { status: 400 });
    }

    const postId = body.postId || randomUUID();
    const status = (body.status || "draft") as ContentStatus;
    const content = body.content ?? null;
    const renderedHtml = body.renderedHtml || renderTiptapToHtml(content) || "";
    const sources = parseSources(body.sources);

    const result = await upsertPostLocale({
      postId,
      shared: {
        authorId: auth.uid,
        thumbnailMediaId: body.thumbnailMediaId,
        thumbnailUrl: body.thumbnailUrl,
        categoryIds: body.categoryIds || [],
        tagIds: body.tagIds || [],
        featured: Boolean(body.featured),
        pinned: Boolean(body.pinned),
        commentsEnabled: body.commentsEnabled ?? true,
        isAffiliateContent: Boolean(body.isAffiliateContent),
        affiliateDisclosureOverride: body.affiliateDisclosureOverride,
        relatedPostIds: body.relatedPostIds || [],
        sources,
        canonicalUrl: body.canonicalUrl,
        updatedBy: auth.email || auth.uid,
      },
      locale: {
        locale: body.locale,
        title: body.title.trim(),
        slug: slugify(body.slug || body.title, postId),
        excerpt: body.excerpt || "",
        content,
        renderedHtml,
        seo: body.seo || {},
        thumbnailAlt: body.thumbnailAlt,
        caption: body.caption,
        status,
        publishedAt:
          status === "published"
            ? body.publishedAt || new Date().toISOString()
            : body.publishedAt ?? null,
        scheduledAt: status === "scheduled" ? body.scheduledAt || null : null,
        lastReviewedAt: null,
        updatedBy: auth.email || auth.uid,
      },
    });

    if (body.createRedirectFrom && body.createRedirectFrom !== result.locale.slug) {
      const db = await getAdminFirestore();
      const fromPath = `/${body.locale}/blog/${body.createRedirectFrom}`;
      const toPath = `/${body.locale}/blog/${result.locale.slug}`;
      const redirectId = Buffer.from(fromPath).toString("base64url").slice(0, 64);
      await db.collection(COLLECTIONS.redirects).doc(redirectId).set(
        {
          id: redirectId,
          fromPath,
          toPath,
          statusCode: 301,
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      );
    }

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "post.save",
      resourceType: "post",
      resourceId: postId,
      details: { locale: body.locale, status },
    });

    return Response.json({ article: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save post");
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePermission(request, "publish_content");
    const body = (await request.json()) as {
      postId?: string;
      locale?: Locale;
      status?: ContentStatus;
      scheduledAt?: string | null;
      bulk?: { ids: { postId: string; locale: Locale }[]; action: string };
      restoreRevisionId?: string;
    };

    if (body.bulk?.ids?.length) {
      const db = await getAdminFirestore();
      const now = new Date().toISOString();
      const action = body.bulk.action;
      let updated = 0;
      for (const item of body.bulk.ids) {
        const ref = db.collection(COLLECTIONS.postLocales).doc(`${item.postId}_${item.locale}`);
        const snap = await ref.get();
        if (!snap.exists) continue;
        if (action === "delete") {
          await ref.delete();
          updated += 1;
          continue;
        }
        const statusMap: Record<string, ContentStatus> = {
          publish: "published",
          unpublish: "draft",
          archive: "archived",
          draft: "draft",
          in_review: "in_review",
        };
        const nextStatus = statusMap[action];
        if (!nextStatus) continue;
        const update: Record<string, unknown> = {
          status: nextStatus,
          updatedAt: now,
          updatedBy: auth.email || auth.uid,
        };
        if (nextStatus === "published") update.publishedAt = now;
        if (nextStatus === "draft") update.publishedAt = null;
        await ref.set(update, { merge: true });
        updated += 1;
      }
      await writeAuditLog({
        actorUid: auth.uid,
        actorEmail: auth.email,
        action: `post.bulk.${action}`,
        resourceType: "postLocale",
        resourceId: "bulk",
        details: { count: updated },
      });
      return Response.json({ ok: true, updated });
    }

    if (body.restoreRevisionId && body.postId && body.locale) {
      const db = await getAdminFirestore();
      const rev = await db.collection(COLLECTIONS.postRevisions).doc(body.restoreRevisionId).get();
      if (!rev.exists) return Response.json({ error: "Revision not found" }, { status: 404 });
      const snapshot = (rev.data()?.snapshot || {}) as Record<string, unknown>;
      const result = await upsertPostLocale({
        postId: body.postId,
        shared: {
          authorId: auth.uid,
          categoryIds: [],
          tagIds: [],
          featured: false,
          commentsEnabled: true,
          isAffiliateContent: false,
          relatedPostIds: [],
          updatedBy: auth.email || auth.uid,
        },
        locale: {
          locale: body.locale,
          title: String(snapshot.title || "Restored"),
          slug: String(snapshot.slug || body.postId),
          excerpt: String(snapshot.excerpt || ""),
          content: (snapshot.content as Record<string, unknown>) || null,
          renderedHtml: String(snapshot.renderedHtml || ""),
          seo: (snapshot.seo as SeoFields) || {},
          status: "draft",
          publishedAt: null,
          scheduledAt: null,
          lastReviewedAt: null,
          updatedBy: auth.email || auth.uid,
        },
      });
      return Response.json({ ok: true, article: result });
    }

    if (!body.postId || !body.locale || !body.status) {
      return Response.json({ error: "postId, locale, and status required" }, { status: 400 });
    }
    const db = await getAdminFirestore();
    const ref = db.collection(COLLECTIONS.postLocales).doc(`${body.postId}_${body.locale}`);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Locale not found" }, { status: 404 });

    const now = new Date().toISOString();
    const update: Record<string, unknown> = {
      status: body.status,
      updatedAt: now,
      updatedBy: auth.email || auth.uid,
    };
    if (body.status === "published") update.publishedAt = now;
    if (body.status === "scheduled") update.scheduledAt = body.scheduledAt || null;
    if (body.status === "draft" || body.status === "archived") update.publishedAt = null;

    await ref.set(update, { merge: true });
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "post.status",
      resourceType: "postLocale",
      resourceId: ref.id,
      details: { status: body.status },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to update post");
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_content");
    const url = new URL(request.url);
    const postId = url.searchParams.get("postId");
    const locale = url.searchParams.get("locale") as Locale | null;
    if (!postId || !locale) {
      return Response.json({ error: "postId and locale required" }, { status: 400 });
    }
    const db = await getAdminFirestore();
    await db.collection(COLLECTIONS.postLocales).doc(`${postId}_${locale}`).delete();
    const remaining = await db
      .collection(COLLECTIONS.postLocales)
      .where("postId", "==", postId)
      .limit(1)
      .get();
    if (remaining.empty) {
      await db.collection(COLLECTIONS.posts).doc(postId).delete().catch(() => undefined);
    }
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "post.delete",
      resourceType: "postLocale",
      resourceId: `${postId}_${locale}`,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete post");
  }
}
