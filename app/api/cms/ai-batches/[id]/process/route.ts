import { FirebaseAccessError } from "../../../../../../lib/firebase/admin";
import { requirePermission } from "../../../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../../../lib/firebase/service-errors";
import { AiGenerationBackendError, processNextAiItem } from "../../../../../../lib/cms/ai-blog";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof AiGenerationBackendError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

async function requireAiOrContentPermission(request: Request) {
  try {
    return await requirePermission(request, "manage_ai_generation");
  } catch (error) {
    if (error instanceof FirebaseAccessError && error.status === 403) {
      return requirePermission(request, "manage_content");
    }
    throw error;
  }
}

/** Processes up to `count` (default 1) queued items for the batch. Idempotent and safe to poll every few seconds. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAiOrContentPermission(request);
    const { id } = await params;

    let count = 1;
    try {
      const body = (await request.json()) as { count?: number } | null;
      if (body && typeof body.count === "number" && Number.isFinite(body.count)) count = body.count;
    } catch {
      // No JSON body supplied; fall back to the default count of 1.
    }

    const result = await processNextAiItem(id, { count });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error, "Unable to process the AI generation batch.");
  }
}
