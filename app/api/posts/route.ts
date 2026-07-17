import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";
import { slugify } from "../../../lib/generator";
import { sanitizeHtml } from "../../../lib/sanitize";

type PostPayload = { slug?: string; title?: string; category?: string; excerpt?: string; content?: string; status?: string };

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
    const snapshot = await db.collection("blogPosts").orderBy("updatedAt", "desc").limit(100).get();
    const posts = snapshot.docs.map((document) => {
      const post = document.data();
      return { id: document.id, ...post, updatedAt: toIso(post.updatedAt) };
    });
    return Response.json({ posts });
  } catch (error) {
    return errorResponse(error, "Unable to load blog posts");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseAdmin(request);
    const body = await request.json() as PostPayload;
    const required = ["title", "category", "excerpt", "content"] as const;
    const missing = required.filter((field) => !body[field]?.trim());
    if (missing.length) return Response.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });

    const db = await getAdminFirestore();
    const slug = slugify(body.slug || body.title!);
    const reference = db.collection("blogPosts").doc(slug);
    const existing = await reference.get();
    const now = new Date();
    const status = body.status === "published" ? "published" : "draft";
    const post = {
      slug,
      title: body.title!.trim(),
      category: body.category!.trim(),
      excerpt: body.excerpt!.trim(),
      html: sanitizeHtml(body.content!),
      status,
      readTime: `${Math.max(1, Math.ceil(body.content!.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length / 200))} min`,
      updatedBy: user.email || user.uid,
      updatedAt: now,
      ...(existing.exists ? {} : { createdBy: user.email || user.uid, createdAt: now }),
      ...(status === "published" ? { publishedAt: now } : {}),
    };
    await reference.set(post, { merge: true });
    return Response.json({ post: { id: slug, ...post, updatedAt: now.toISOString() } }, { status: existing.exists ? 200 : 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save the blog post");
  }
}
