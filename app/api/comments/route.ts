import { NextResponse } from "next/server";
import { getAdminFirestore } from "../../../lib/firebase/admin";
import { commentSubmitSchema } from "../../../lib/validation/schemas";
import { COLLECTIONS } from "../../../lib/cms/collections";
import { getSiteSettings } from "../../../lib/cms/settings";
import { sanitizeHtml } from "../../../lib/sanitize";

const recentByIp = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = commentSubmitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid input" }, { status: 400 });
    }
    if (parsed.data.honeypot) {
      return NextResponse.json({ ok: true });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const last = recentByIp.get(ip) || 0;
    if (Date.now() - last < 15_000) {
      return NextResponse.json({ error: "Rate limit" }, { status: 429 });
    }
    recentByIp.set(ip, Date.now());

    const settings = await getSiteSettings();
    if (!settings.commentsEnabled) {
      return NextResponse.json({ error: "Comments disabled" }, { status: 403 });
    }

    const db = await getAdminFirestore();
    const now = new Date().toISOString();
    const status = settings.commentsRequireModeration ? "pending" : "approved";
    const commentRef = db.collection(COLLECTIONS.comments).doc();
    const bodyText = sanitizeHtml(parsed.data.body).slice(0, 4000);

    await commentRef.set({
      id: commentRef.id,
      postId: parsed.data.postId,
      parentId: parsed.data.parentId ?? null,
      displayName: parsed.data.displayName.slice(0, 80),
      body: bodyText,
      status,
      locale: parsed.data.locale,
      createdAt: now,
      updatedAt: now,
    });

    if (parsed.data.email) {
      await db.collection(COLLECTIONS.commentPrivateData).doc(commentRef.id).set({
        commentId: commentRef.id,
        email: parsed.data.email,
        ipHash: Buffer.from(ip).toString("base64url").slice(0, 32),
        createdAt: now,
      });
    }

    return NextResponse.json({ ok: true, id: commentRef.id, status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
