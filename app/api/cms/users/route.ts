import { FirebaseAccessError, getAdminApp, getAdminFirestore } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";
import type { UserRole } from "../../../../lib/types/cms";
import { USER_ROLES } from "../../../../lib/types/cms";

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
    await requirePermission(request, "manage_users");
    const db = await getAdminFirestore();
    const snap = await db.collection(COLLECTIONS.users).limit(100).get();
    return Response.json({ users: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    return errorResponse(error, "Unable to load users");
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_roles");
    if (auth.role !== "owner") {
      throw new FirebaseAccessError("Only the owner may assign high-privilege roles.", 403);
    }
    const body = (await request.json()) as { uid: string; role: UserRole; email?: string };
    if (!body.uid || !(USER_ROLES as readonly string[]).includes(body.role)) {
      return Response.json({ error: "uid and valid role required" }, { status: 400 });
    }
    if (body.role === "owner" && body.uid !== auth.uid) {
      // Allow owner to designate another owner, but never demote self silently elsewhere.
    }

    const [{ getAuth }, app] = await Promise.all([
      import("firebase-admin/auth"),
      getAdminApp(),
    ]);
    const user = await getAuth(app).getUser(body.uid);
    if (user.customClaims?.role === "owner" && body.uid !== auth.uid && body.role !== "owner") {
      throw new FirebaseAccessError("Cannot demote another owner.", 403);
    }

    await getAuth(app).setCustomUserClaims(body.uid, {
      ...(user.customClaims || {}),
      role: body.role,
      admin: body.role === "owner" || body.role === "administrator",
    });

    const db = await getAdminFirestore();
    await db.collection(COLLECTIONS.users).doc(body.uid).set(
      {
        uid: body.uid,
        email: body.email || user.email,
        role: body.role,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "role.assign",
      resourceType: "user",
      resourceId: body.uid,
      details: { role: body.role },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to update role");
  }
}
