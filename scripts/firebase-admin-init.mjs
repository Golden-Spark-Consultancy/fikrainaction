/**
 * Shared Firebase Admin init for local scripts.
 * Loads .env.local if present, then resolves credentials from:
 *   1. --credentials path/to/serviceAccount.json
 *   2. FIREBASE_SERVICE_ACCOUNT_JSON (raw JSON string)
 *   3. GOOGLE_APPLICATION_CREDENTIALS (file path)
 *   4. Application Default Credentials (gcloud ADC)
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";

export function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function credentialsPathFromArgv(argv = process.argv) {
  const flagIndex = argv.findIndex((arg) => arg === "--credentials" || arg === "-c");
  if (flagIndex >= 0 && argv[flagIndex + 1]) return resolve(argv[flagIndex + 1]);
  const inline = argv.find((arg) => arg.startsWith("--credentials="));
  if (inline) return resolve(inline.slice("--credentials=".length));
  return null;
}

export function printAuthHelp() {
  console.error(`
Firebase credentials are required for this script.

Option A — service account file (recommended on Windows without gcloud):
  1. Open Firebase Console → Project settings → Service accounts
  2. Generate new private key (JSON). Do NOT commit it.
  3. Save it outside the repo, e.g. %USERPROFILE%\\.secrets\\fikra-e47d9.json
  4. Run:
       npm run migrate:dry-run -- --credentials %USERPROFILE%\\.secrets\\fikra-e47d9.json

Option B — env var with JSON contents in .env.local:
  FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

Option C — Application Default Credentials:
  Install Google Cloud SDK, then:
       gcloud auth application-default login
       gcloud config set project fikra-e47d9
`);
}

export function initFirebaseAdmin(argv = process.argv) {
  loadEnvLocal();
  if (getApps().length) return;

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fikra-e47d9";
  const options = { projectId };
  const credentialsFile = credentialsPathFromArgv(argv) || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());

  if (!hasJson && !credentialsFile) {
    throw new Error(
      "No Firebase credentials configured. Pass --credentials <file.json> or set FIREBASE_SERVICE_ACCOUNT_JSON.",
    );
  }

  try {
    if (hasJson) {
      options.credential = cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON));
    } else {
      if (!existsSync(credentialsFile)) {
        throw new Error(`Credentials file not found: ${credentialsFile}`);
      }
      options.credential = cert(JSON.parse(readFileSync(credentialsFile, "utf8")));
    }
    initializeApp(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/No Firebase credentials configured/.test(message)) printAuthHelp();
    throw error;
  }
}
