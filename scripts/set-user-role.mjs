/**
 * Assign Firebase custom claims roles for fikraInAction CMS.
 *
 * Usage:
 *   node scripts/set-user-role.mjs user@example.com owner
 *   node scripts/set-user-role.mjs user@example.com administrator
 *   node scripts/set-user-role.mjs user@example.com editor
 *   node scripts/set-user-role.mjs user@example.com author
 *   node scripts/set-user-role.mjs user@example.com moderator
 *
 * Only an existing owner should assign high-privilege roles in production.
 * The bootstrap admin email remains accepted until roles are fully rolled out.
 */
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin, printAuthHelp } from "./firebase-admin-init.mjs";

const email = process.argv[2];
const role = process.argv[3];
const allowed = new Set(["owner", "administrator", "editor", "author", "moderator"]);

if (!email || !allowed.has(role)) {
  console.error("Usage: node scripts/set-user-role.mjs <email> <role> [--credentials path.json]");
  process.exit(1);
}

function init() {
  initFirebaseAdmin();
}

async function main() {
  init();
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  const claims = {
    ...(user.customClaims || {}),
    role,
    admin: role === "owner" || role === "administrator",
  };
  await auth.setCustomUserClaims(user.uid, claims);
  const db = getFirestore();
  await db.collection("users").doc(user.uid).set(
    {
      uid: user.uid,
      email: user.email,
      role,
      updatedAt: new Date().toISOString(),
      displayName: { en: user.displayName || email, ar: user.displayName || email },
      bio: {},
    },
    { merge: true },
  );
  await db.collection("auditLogs").add({
    actorUid: "script",
    action: "role.assign",
    resourceType: "user",
    resourceId: user.uid,
    details: { email, role },
    createdAt: new Date().toISOString(),
  });
  console.log(`Assigned role=${role} to ${email} (${user.uid}). User must sign out/in.`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/credentials|ADC|auth/i.test(message)) printAuthHelp();
  console.error(message);
  process.exit(1);
});
