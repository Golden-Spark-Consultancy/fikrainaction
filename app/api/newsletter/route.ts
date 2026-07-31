import { NextResponse } from "next/server";
import { getAdminFirestore } from "../../../lib/firebase/admin";
import { newsletterSubmitSchema } from "../../../lib/validation/schemas";
import { COLLECTIONS } from "../../../lib/cms/collections";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let body: Record<string, unknown>;
    if (contentType.includes("application/json")) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }

    const parsed = newsletterSubmitSchema.safeParse({
      ...body,
      consent: body.consent === true || body.consent === "true",
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    if (parsed.data.honeypot) return NextResponse.json({ ok: true });

    const db = await getAdminFirestore();
    const id = Buffer.from(parsed.data.email.toLowerCase()).toString("base64url");
    const ref = db.collection(COLLECTIONS.newsletterSubscribers).doc(id);
    const existing = await ref.get();
    if (existing.exists && existing.data()?.status === "subscribed") {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    await ref.set(
      {
        id,
        email: parsed.data.email.toLowerCase(),
        locale: parsed.data.locale,
        status: "subscribed",
        createdAt: existing.exists ? existing.data()?.createdAt : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed" },
      { status: 500 },
    );
  }
}
