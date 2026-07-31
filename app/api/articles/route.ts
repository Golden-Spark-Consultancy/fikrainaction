import { randomUUID } from "node:crypto";
import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../lib/cms/collections";
import { upsertPostLocale } from "../../../lib/cms/posts";
import { renderTiptapToHtml } from "../../../lib/content/render-tiptap";
import type { Locale } from "../../../lib/i18n/config";
import type { ContentStatus } from "../../../lib/types/cms";

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

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const db = await getAdminFirestore();
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const locale = (url.searchParams.get("locale") || "en") as Locale;

    if (id) {
      const shared = await db.collection(COLLECTIONS.posts).doc(id).get();
      const localeDoc = await db.collection(COLLECTIONS.postLocales).doc(`${id}_${locale}`).get();
      const revisions = await db
        .collection(COLLECTIONS.postRevisions)
        .where("postId", "==", id)
        .where("locale", "==", locale)
        .limit(20)
        .get()
        .catch(() => null);

      // Fallback to legacy blogPosts
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
          revisions: revisions?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [],
        },
      });
    }

    const [localesSnap, legacySnap] = await Promise.all([
      db.collection(COLLECTIONS.postLocales).orderBy("updatedAt", "desc").limit(100).get().catch(() => null),
      db.collection("blogPosts").orderBy("updatedAt", "desc").limit(100).get().catch(() => null),
    ]);

    const articles = [
      ...(localesSnap?.docs.map((d) => {
        const data = d.data();
        return {
          id: data.postId || d.id,
          locale: data.locale,
          title: data.title,
          slug: data.slug,
          status: data.status,
          excerpt: data.excerpt,
          updatedAt: data.updatedAt,
          source: "postLocales",
        };
      }) ?? []),
      ...(legacySnap?.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          locale: "en",
          title: data.title,
          slug: data.slug || d.id,
          status: data.status,
          excerpt: data.excerpt,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || data.updatedAt,
          source: "blogPosts",
        };
      }) ?? []),
    ];

    return Response.json({ articles });
  } catch (error) {
    return errorResponse(error, "Unable to load articles");
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
      seo?: Record<string, unknown>;
      categoryIds?: string[];
      tagIds?: string[];
      featured?: boolean;
      commentsEnabled?: boolean | null;
      isAffiliateContent?: boolean;
      relatedPostIds?: string[];
      thumbnailAlt?: string;
      caption?: string;
      createRedirectFrom?: string;
    };

    if (!body.title?.trim() || !body.locale) {
      return Response.json({ error: "title and locale are required" }, { status: 400 });
    }

    const postId = body.postId || randomUUID();
    const status = (body.status || "draft") as ContentStatus;
    const content = body.content ?? null;
    const renderedHtml =
      body.renderedHtml ||
      renderTiptapToHtml(content) ||
      "";

    const result = await upsertPostLocale({
      postId,
      shared: {
        authorId: auth.uid,
        categoryIds: body.categoryIds || [],
        tagIds: body.tagIds || [],
        featured: Boolean(body.featured),
        commentsEnabled: body.commentsEnabled ?? true,
        isAffiliateContent: Boolean(body.isAffiliateContent),
        relatedPostIds: body.relatedPostIds || [],
        updatedBy: auth.email || auth.uid,
      },
      locale: {
        locale: body.locale,
        title: body.title.trim(),
        slug: (body.slug || body.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 180) || postId,
        excerpt: body.excerpt || "",
        content,
        renderedHtml,
        seo: (body.seo || {}) as {
          title?: string;
          description?: string;
          socialTitle?: string;
          socialDescription?: string;
          noIndex?: boolean;
        },
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
      const id = Buffer.from(fromPath).toString("base64url").slice(0, 64);
      await db.collection(COLLECTIONS.redirects).doc(id).set(
        {
          id,
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
      action: "article.save",
      resourceType: "post",
      resourceId: postId,
      details: { locale: body.locale, status },
    });

    return Response.json({ article: result }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save article");
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePermission(request, "publish_content");
    const body = (await request.json()) as {
      postId: string;
      locale: Locale;
      status: ContentStatus;
      scheduledAt?: string | null;
    };
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

    await ref.set(update, { merge: true });
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "article.status",
      resourceType: "postLocale",
      resourceId: ref.id,
      details: { status: body.status },
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to update status");
  }
}
