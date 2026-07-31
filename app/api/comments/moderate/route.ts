import { randomUUID } from "node:crypto";
import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";
import type { CommentStatus, Locale } from "../../../../lib/types/cms";

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
    await requirePermission(request, "manage_comments");
    const db = await getAdminFirestore();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const snap = await db
      .collection(COLLECTIONS.comments)
      .orderBy("createdAt", "desc")
      .limit(200)
      .get();
    let comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (status) {
      comments = comments.filter((c) => (c as { status?: string }).status === status);
    }
    if (q) {
      comments = comments.filter((c) => {
        const row = c as { displayName?: string; body?: string; postId?: string };
        return (
          row.displayName?.toLowerCase().includes(q) ||
          row.body?.toLowerCase().includes(q) ||
          row.postId?.toLowerCase().includes(q)
        );
      });
    }
    return Response.json({ comments });
  } catch (error) {
    return errorResponse(error, "Unable to load comments");
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_comments");
    const body = (await request.json()) as {
      ids?: string[];
      id?: string;
      status?: CommentStatus;
      reply?: {
        parentId: string;
        postId: string;
        locale: Locale;
        body: string;
      };
    };

    const db = await getAdminFirestore();
    const now = new Date().toISOString();

    if (body.reply?.body?.trim()) {
      const id = randomUUID();
      await db.collection(COLLECTIONS.comments).doc(id).set({
        id,
        postId: body.reply.postId,
        parentId: body.reply.parentId,
        displayName: "fikraInAction Editorial",
        body: body.reply.body.trim().slice(0, 4000),
        status: "approved",
        locale: body.reply.locale || "ar",
        createdAt: now,
        updatedAt: now,
        createdBy: auth.email || auth.uid,
      });
      await writeAuditLog({
        actorUid: auth.uid,
        actorEmail: auth.email,
        action: "comments.reply",
        resourceType: "comments",
        resourceId: id,
        details: { parentId: body.reply.parentId },
      });
      return Response.json({ ok: true, id });
    }

    const ids = body.ids || (body.id ? [body.id] : []);
    if (!ids.length || !body.status) {
      return Response.json({ error: "ids and status required" }, { status: 400 });
    }
    const batch = db.batch();
    for (const id of ids) {
      batch.set(
        db.collection(COLLECTIONS.comments).doc(id),
        { status: body.status, updatedAt: now },
        { merge: true },
      );
    }
    await batch.commit();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "comments.moderate",
      resourceType: "comments",
      resourceId: ids.join(","),
      details: { status: body.status, count: ids.length },
    });
    return Response.json({ ok: true, count: ids.length });
  } catch (error) {
    return errorResponse(error, "Unable to moderate comments");
  }
}

export async function DELETE(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    return Response.json({ error: "Use PATCH status=trash instead of hard delete" }, { status: 405 });
  } catch (error) {
    return errorResponse(error, "Unable to delete comment");
  }
}
