import { NextResponse } from "next/server";
import { formatCode } from "../../../lib/content/format-code";
import { requirePermission } from "../../../lib/firebase/authz";
import { FirebaseAccessError } from "../../../lib/firebase/admin";

export async function POST(request: Request) {
  try {
    await requirePermission(request, "edit_own_content");
    const body = (await request.json()) as { language?: string; code?: string };
    if (!body.language || typeof body.code !== "string") {
      return NextResponse.json({ error: "language and code required" }, { status: 400 });
    }
    const result = await formatCode(body.language, body.code);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof FirebaseAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
