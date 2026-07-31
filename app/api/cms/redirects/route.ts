import { FirebaseAccessError, getAdminFirestore } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";

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
    await requirePermission(request, "manage_settings");
    const db = await getAdminFirestore();
    const snap = await db.collection(COLLECTIONS.redirects).limit(200).get();
    return Response.json({
      redirects: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
    });
  } catch (error) {
    return errorResponse(error, "Unable to load redirects");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_settings");
    const body = (await request.json()) as {
      fromPath: string;
      toPath: string;
      statusCode?: 301 | 302;
    };
    if (!body.fromPath?.startsWith("/") || !body.toPath?.startsWith("/")) {
      return Response.json({ error: "fromPath and toPath must start with /" }, { status: 400 });
    }
    const db = await getAdminFirestore();
    const id = Buffer.from(body.fromPath).toString("base64url").slice(0, 64);
    const doc = {
      id,
      fromPath: body.fromPath,
      toPath: body.toPath,
      statusCode: body.statusCode || 301,
      createdAt: new Date().toISOString(),
    };
    await db.collection(COLLECTIONS.redirects).doc(id).set(doc, { merge: true });
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "redirect.create",
      resourceType: "redirect",
      resourceId: id,
      details: doc,
    });
    return Response.json({ redirect: doc }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save redirect");
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_settings");
    const id = new URL(request.url).searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    const db = await getAdminFirestore();
    await db.collection(COLLECTIONS.redirects).doc(id).delete();
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "redirect.delete",
      resourceType: "redirect",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete redirect");
  }
}
