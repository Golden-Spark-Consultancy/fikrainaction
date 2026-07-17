import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run firebase:grant-admin -- administrator@example.com");
  process.exit(1);
}

const app = getApps()[0] ?? initializeApp({ credential: applicationDefault() });
const auth = getAuth(app);
const user = await auth.getUserByEmail(email);
await auth.setCustomUserClaims(user.uid, { ...user.customClaims, admin: true });
console.log(`Firebase administrator access granted to ${email}. Sign out and back in to refresh the token.`);
