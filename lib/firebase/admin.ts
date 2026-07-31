import type { App, AppOptions } from "firebase-admin/app";
import type { DecodedIdToken } from "firebase-admin/auth";

let adminAppPromise: Promise<App> | null = null;

function parseFirebaseConfig() {
  try {
    return process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG) as { projectId?: string; storageBucket?: string } : {};
  } catch {
    return {};
  }
}

async function createAdminApp() {
  const { applicationDefault, cert, getApp, getApps, initializeApp } = await import("firebase-admin/app");
  if (getApps().length) return getApp();

  const platformConfig = parseFirebaseConfig();
  const options: AppOptions = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || platformConfig.projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || platformConfig.storageBucket,
  };

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    options.credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
  } else if (!process.env.FIREBASE_CONFIG) {
    options.credential = applicationDefault();
  }

  return initializeApp(options);
}

export async function getAdminApp() {
  adminAppPromise ??= createAdminApp();
  return adminAppPromise;
}

export async function getAdminFirestore() {
  const [{ getFirestore }, app] = await Promise.all([import("firebase-admin/firestore"), getAdminApp()]);
  return getFirestore(app);
}

export async function getAdminStorage() {
  const [{ getStorage }, app] = await Promise.all([import("firebase-admin/storage"), getAdminApp()]);
  return getStorage(app);
}

export async function requireFirebaseAdmin(request: Request): Promise<DecodedIdToken> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  if (!token) throw new FirebaseAccessError("Sign in is required.", 401);

  try {
    const [{ getAuth }, app] = await Promise.all([import("firebase-admin/auth"), getAdminApp()]);
    const decoded = await getAuth(app).verifyIdToken(token);
    const allowedEmails = new Set(
      (process.env.FIREBASE_ADMIN_EMAILS || "goldensparkbh@gmail.com")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    );
    const allowedByEmail = Boolean(decoded.email && allowedEmails.has(decoded.email.toLowerCase()));
    const role = typeof decoded.role === "string" ? decoded.role : "";
    const allowedByRole =
      decoded.admin === true ||
      role === "owner" ||
      role === "administrator" ||
      role === "editor";
    if (!allowedByRole && !allowedByEmail) {
      throw new FirebaseAccessError("This account is not authorized to manage the site.", 403);
    }
    return decoded;
  } catch (error) {
    if (error instanceof FirebaseAccessError) throw error;
    throw new FirebaseAccessError("Your session is invalid or has expired.", 401);
  }
}

export class FirebaseAccessError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = "FirebaseAccessError";
  }
}
