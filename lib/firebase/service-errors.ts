export type FirebaseServiceIssue = {
  error: string;
  code: "FIRESTORE_SETUP_REQUIRED" | "STORAGE_SETUP_REQUIRED";
  setupUrl: string;
};

function errorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === "object" && error) {
    const record = error as Record<string, unknown>;
    return `${String(record.code ?? "")} ${String(record.details ?? "")} ${String(record.message ?? "")}`;
  }
  return String(error ?? "");
}

export function getFirebaseServiceIssue(error: unknown): FirebaseServiceIssue | null {
  const text = errorText(error).toLowerCase();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "fikra-e47d9";
  const firestoreUnavailable = text.includes("firestore.googleapis.com") && (text.includes("disabled") || text.includes("not been used"));

  if (firestoreUnavailable) {
    return {
      error: `Cloud Firestore is not enabled for ${projectId}. Open Firebase Console, create the Firestore database in Native mode, then wait a few minutes and retry.`,
      code: "FIRESTORE_SETUP_REQUIRED",
      setupUrl: `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/firestore`,
    };
  }

  const storageUnavailable = text.includes("storage.googleapis.com") && (text.includes("disabled") || text.includes("not been used") || text.includes("does not exist"));
  if (storageUnavailable) {
    return {
      error: `Firebase Storage is not enabled for ${projectId}. Open Firebase Console, create the default Storage bucket, then wait a few minutes and retry.`,
      code: "STORAGE_SETUP_REQUIRED",
      setupUrl: `https://console.firebase.google.com/project/${encodeURIComponent(projectId)}/storage`,
    };
  }

  return null;
}
