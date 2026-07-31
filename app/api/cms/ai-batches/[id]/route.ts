import { FirebaseAccessError } from "../../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../../lib/firebase/service-errors";
import { AiGenerationBackendError, cancelAiBatch, getAiBatch, retryAiBatchItem } from "../../../../../lib/cms/ai-blog";

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

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAiOrContentPermission(request);
    const { id } = await params;
    const result = await getAiBatch(id);
    if (!result) return Response.json({ error: "Batch not found." }, { status: 404 });
    return Response.json(result);
  } catch (error) {
    return errorResponse(error, "Unable to load the batch.");
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAiOrContentPermission(request);
    const { id } = await params;
    const body = (await request.json()) as { action?: "cancel" | "retry"; itemId?: string };

    if (body.action === "cancel") {
      const batch = await cancelAiBatch(id);
      await writeAuditLog({
        actorUid: auth.uid,
        actorEmail: auth.email,
        action: "ai_batch.cancel",
        resourceType: "aiBatch",
        resourceId: id,
      });
      return Response.json({ batch });
    }

    if (body.action === "retry") {
      if (!body.itemId) return Response.json({ error: "itemId is required to retry an item." }, { status: 400 });
      const item = await retryAiBatchItem(id, body.itemId);
      await writeAuditLog({
        actorUid: auth.uid,
        actorEmail: auth.email,
        action: "ai_batch.retry_item",
        resourceType: "aiBatchItem",
        resourceId: body.itemId,
        details: { batchId: id },
      });
      return Response.json({ item });
    }

    return Response.json({ error: "action must be 'cancel' or 'retry'." }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "Unable to update the batch.");
  }
}
