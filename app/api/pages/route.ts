import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";
import { sanitizeHtml } from "../../../lib/sanitize";

type PagePayload = {
  title?: string;
  slug?: string;
  pageType?: string;
  status?: string;
  seo?: { title?: string; description?: string };
  html?: string;
  affiliateUrl?: string;
  affiliateDisclosure?: string;
  content?: unknown;
};

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

function toIso(value: unknown) {
  return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
    ? (value.toDate() as Date).toISOString()
    : new Date().toISOString();
}

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const db = await getAdminFirestore();
    const snapshot = await db.collection("landingPages").orderBy("updatedAt", "desc").limit(100).get();
    const pages = snapshot.docs.map((document) => {
      const page = document.data();
      return { id: document.id, title: page.title, slug: page.slug, status: page.status, pageType: page.pageType, updatedAt: toIso(page.updatedAt) };
    });
    return Response.json({ pages });
  } catch (error) {
    return errorResponse(error, "Unable to load pages");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseAdmin(request);
    const body = await request.json() as PagePayload;
    if (!body.title || !body.slug || !body.pageType || !body.html || !body.affiliateUrl) {
      return Response.json({ error: "Title, slug, page type, HTML, and affiliate URL are required." }, { status: 400 });
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(body.slug)) {
      return Response.json({ error: "The URL slug may contain lowercase letters, numbers, and single hyphens only." }, { status: 400 });
    }
    try { new URL(body.affiliateUrl); } catch { return Response.json({ error: "The affiliate URL must be a valid web address." }, { status: 400 }); }

    const db = await getAdminFirestore();
    const pageRef = db.collection("landingPages").doc(body.slug);
    const revisionRef = pageRef.collection("revisions").doc();
    const status = body.status === "published" ? "published" : "draft";
    const safeHtml = sanitizeHtml(body.html);
    const existing = await pageRef.get();
    const now = new Date();
    const page = {
      title: body.title,
      slug: body.slug,
      pageType: body.pageType,
      status,
      seoTitle: body.seo?.title || body.title,
      metaDescription: body.seo?.description || "",
      content: body.content ?? {},
      html: safeHtml,
      affiliateUrl: body.affiliateUrl,
      affiliateDisclosure: body.affiliateDisclosure || "Fikra in Action may earn a commission from links on this page.",
      updatedBy: user.email || user.uid,
      updatedAt: now,
      ...(existing.exists ? {} : { createdBy: user.email || user.uid, createdAt: now }),
      ...(status === "published" ? { publishedAt: now } : {}),
    };

    const batch = db.batch();
    batch.set(pageRef, page, { merge: true });
    batch.set(revisionRef, { pageId: body.slug, content: body.content ?? {}, html: safeHtml, changeType: status, createdBy: user.email || user.uid, createdAt: now });
    await batch.commit();

    return Response.json({ page: { id: body.slug, slug: body.slug, status, publicUrl: `/reviews/${body.slug}` } }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save the page");
  }
}
