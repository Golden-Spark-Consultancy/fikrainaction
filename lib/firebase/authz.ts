import type { Locale, Permission, UserRole } from "../types/cms";
import { roleHasPermission } from "../i18n/config";
import { FirebaseAccessError, getAdminApp } from "./admin";

export type AuthContext = {
  uid: string;
  email?: string;
  role: UserRole;
  claims: Record<string, unknown>;
};

const BOOTSTRAP_ADMIN_EMAILS = () =>
  new Set(
    (process.env.FIREBASE_ADMIN_EMAILS || "goldensparkbh@gmail.com")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );

function resolveRole(claims: Record<string, unknown>, email?: string): UserRole {
  const roleClaim = claims.role;
  if (
    roleClaim === "owner" ||
    roleClaim === "administrator" ||
    roleClaim === "editor" ||
    roleClaim === "author" ||
    roleClaim === "moderator"
  ) {
    return roleClaim;
  }
  if (claims.admin === true) return "administrator";
  if (email && BOOTSTRAP_ADMIN_EMAILS().has(email.toLowerCase())) return "owner";
  throw new FirebaseAccessError("This account is not authorized to manage the site.", 403);
}

export async function requireAuth(request: Request): Promise<AuthContext> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw new FirebaseAccessError("Sign in is required.", 401);

  try {
    const [{ getAuth }, app] = await Promise.all([
      import("firebase-admin/auth"),
      getAdminApp(),
    ]);
    const decoded = await getAuth(app).verifyIdToken(token);
    const role = resolveRole(decoded as Record<string, unknown>, decoded.email);
    return {
      uid: decoded.uid,
      email: decoded.email,
      role,
      claims: decoded as Record<string, unknown>,
    };
  } catch (error) {
    if (error instanceof FirebaseAccessError) throw error;
    throw new FirebaseAccessError("Your session is invalid or has expired.", 401);
  }
}

export async function requirePermission(
  request: Request,
  permission: Permission,
): Promise<AuthContext> {
  const auth = await requireAuth(request);
  if (!roleHasPermission(auth.role, permission)) {
    throw new FirebaseAccessError("You do not have permission for this action.", 403);
  }
  return auth;
}

export async function writeAuditLog(entry: {
  actorUid: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  locale?: Locale;
}) {
  const { getAdminFirestore } = await import("./admin");
  const db = await getAdminFirestore();
  await db.collection("auditLogs").add({
    ...entry,
    createdAt: new Date().toISOString(),
  });
}

// Re-export for gradual migration of existing routes.
export { FirebaseAccessError } from "./admin";
