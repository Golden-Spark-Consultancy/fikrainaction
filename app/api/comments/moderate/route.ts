import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";
import type { CommentStatus } from "../../../../lib/types/cms";

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
    let query = db.collection(COLLECTIONS.comments).orderBy("createdAt", "desc").limit(100);
    const snap = await query.get();
    let comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (status) comments = comments.filter((c) => (c as { status?: string }).status === status);
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
      status: CommentStatus;
    };
    const ids = body.ids || (body.id ? [body.id] : []);
    if (!ids.length || !body.status) {
      return Response.json({ error: "ids and status required" }, { status: 400 });
    }
    const db = await getAdminFirestore();
    const batch = db.batch();
    const now = new Date().toISOString();
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
