import { FirebaseAccessError } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import {
  AiGenerationBackendError,
  DEFAULT_MAX_POSTS,
  HARD_MAX_POSTS,
  createAiBatch,
  listAiBatches,
} from "../../../../lib/cms/ai-blog";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof AiGenerationBackendError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

/** Either dedicated AI-generation access or the broader content-management permission may manage batches. */
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

export async function GET(request: Request) {
  try {
    await requireAiOrContentPermission(request);
    const batches = await listAiBatches(50);
    return Response.json({ batches });
  } catch (error) {
    return errorResponse(error, "Unable to load AI batches.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAiOrContentPermission(request);
    const body = (await request.json()) as {
      topics?: unknown;
      language?: "ar" | "en" | "both";
      style?: string;
      audience?: string;
      length?: "short" | "medium" | "long";
      includeRecommendations?: boolean;
      maxPosts?: number;
    };

    const topics = Array.isArray(body.topics)
      ? [...new Set((body.topics as unknown[]).map((topic) => String(topic).trim()).filter(Boolean))]
      : [];
    if (!topics.length) return Response.json({ error: "At least one topic is required." }, { status: 400 });
    if (!body.language || !["ar", "en", "both"].includes(body.language)) {
      return Response.json({ error: "language must be 'ar', 'en', or 'both'." }, { status: 400 });
    }
    if (topics.length > HARD_MAX_POSTS) {
      return Response.json({ error: `A batch can include at most ${HARD_MAX_POSTS} topics.` }, { status: 400 });
    }

    const maxPosts = Math.min(HARD_MAX_POSTS, Math.max(1, Number(body.maxPosts) || DEFAULT_MAX_POSTS));

    const { batch, items } = await createAiBatch({
      topics,
      language: body.language,
      style: body.style,
      audience: body.audience,
      length: body.length,
      includeRecommendations: Boolean(body.includeRecommendations),
      maxPosts,
      createdBy: auth.email || auth.uid,
    });

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "ai_batch.create",
      resourceType: "aiBatch",
      resourceId: batch.id,
      details: { topics: batch.topics.length, language: batch.language, maxPosts: batch.maxPosts },
    });

    return Response.json({ batch, items }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to create the AI generation batch.");
  }
}
