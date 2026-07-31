import { FirebaseAccessError, getAdminFirestore } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";

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

export async function GET(request: Request) {
  try {
    await requirePermission(request, "import_export");
    const url = new URL(request.url);
    const type = url.searchParams.get("type") || "articles";
    const format = url.searchParams.get("format") || "json";
    const db = await getAdminFirestore();

    if (type === "articles") {
      const snap = await db.collection(COLLECTIONS.postLocales).limit(500).get();
      const rows = snap.docs.map((d) => d.data());
      if (format === "csv") {
        const header = "postId,locale,title,slug,status,publishedAt\n";
        const body = rows
          .map((r) =>
            [r.postId, r.locale, JSON.stringify(r.title || ""), r.slug, r.status, r.publishedAt || ""].join(","),
          )
          .join("\n");
        return new Response(header + body, {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": 'attachment; filename="articles.csv"',
          },
        });
      }
      return Response.json({ exportedAt: new Date().toISOString(), type, items: rows });
    }

    if (type === "settings") {
      const snap = await db.collection(COLLECTIONS.siteSettings).doc("default").get();
      return Response.json({ exportedAt: new Date().toISOString(), type, settings: snap.data() || null });
    }

    if (type === "media") {
      const snap = await db.collection(COLLECTIONS.media).limit(500).get().catch(async () =>
        db.collection("mediaAssets").limit(500).get(),
      );
      return Response.json({
        exportedAt: new Date().toISOString(),
        type,
        items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      });
    }

    return Response.json({ error: "Unknown export type" }, { status: 400 });
  } catch (error) {
    return errorResponse(error, "Unable to export");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "import_export");
    const body = (await request.json()) as {
      dryRun?: boolean;
      type: "articles";
      items: Record<string, unknown>[];
      overwrite?: boolean;
    };
    if (body.type !== "articles" || !Array.isArray(body.items)) {
      return Response.json({ error: "Unsupported import payload" }, { status: 400 });
    }

    const db = await getAdminFirestore();
    let created = 0;
    let skipped = 0;
    let conflicts = 0;

    for (const item of body.items.slice(0, 200)) {
      const postId = String(item.postId || "");
      const locale = String(item.locale || "");
      if (!postId || !locale) {
        skipped += 1;
        continue;
      }
      const id = `${postId}_${locale}`;
      const ref = db.collection(COLLECTIONS.postLocales).doc(id);
      const existing = await ref.get();
      if (existing.exists && !body.overwrite) {
        conflicts += 1;
        continue;
      }
      if (!body.dryRun) {
        await ref.set({ ...item, id, updatedAt: new Date().toISOString() }, { merge: true });
      }
      created += 1;
    }

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: body.dryRun ? "import.dryRun" : "import.apply",
      resourceType: "postLocales",
      resourceId: "batch",
      details: { created, skipped, conflicts, overwrite: Boolean(body.overwrite) },
    });

    return Response.json({ ok: true, dryRun: Boolean(body.dryRun), created, skipped, conflicts });
  } catch (error) {
    return errorResponse(error, "Unable to import");
  }
}
