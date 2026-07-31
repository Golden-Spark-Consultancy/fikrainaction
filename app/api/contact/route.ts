import { NextResponse } from "next/server";
import { getAdminFirestore } from "../../../lib/firebase/admin";
import { contactSubmitSchema } from "../../../lib/validation/schemas";
import { COLLECTIONS } from "../../../lib/cms/collections";
import { sanitizeHtml } from "../../../lib/sanitize";

const recentByIp = new Map<string, number>();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = contactSubmitSchema.safeParse({
      ...body,
      consent: body.consent === true || body.consent === "true",
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (parsed.data.honeypot) return NextResponse.json({ ok: true });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const last = recentByIp.get(ip) || 0;
    if (Date.now() - last < 30_000) {
      return NextResponse.json({ error: "Rate limit" }, { status: 429 });
    }
    recentByIp.set(ip, Date.now());

    const db = await getAdminFirestore();
    await db.collection(COLLECTIONS.contactSubmissions).add({
      name: parsed.data.name,
      email: parsed.data.email,
      subject: parsed.data.subject,
      message: sanitizeHtml(parsed.data.message),
      locale: parsed.data.locale,
      createdAt: new Date().toISOString(),
      status: "new",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
