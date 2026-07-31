import { FirebaseAccessError } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { generateAiImageFromPrompt } from "../../../../lib/cms/ai-featured-image";

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

/** Generate an image from a prompt, store it in Media, return URL for editor insert. */
export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "edit_own_content");
    const body = (await request.json()) as { prompt?: string; alt?: string };
    const prompt = String(body.prompt || "").trim();
    if (!prompt) {
      return Response.json({ error: "prompt is required." }, { status: 400 });
    }
    if (prompt.length > 1200) {
      return Response.json({ error: "Prompt is too long (max 1200 characters)." }, { status: 400 });
    }

    const result = await generateAiImageFromPrompt({
      prompt,
      alt: body.alt ? String(body.alt).trim() : undefined,
      uploadedBy: auth.email || auth.uid,
    });

    if ("error" in result) {
      return Response.json({ error: result.error }, { status: 502 });
    }

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "media.ai_generate",
      resourceType: "media",
      resourceId: result.mediaId,
      details: { prompt: prompt.slice(0, 200) },
    });

    return Response.json({
      asset: {
        id: result.mediaId,
        url: result.url,
        alt: result.alt,
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to generate AI image.");
  }
}
