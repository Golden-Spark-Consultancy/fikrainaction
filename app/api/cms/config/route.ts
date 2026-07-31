import { FirebaseAccessError, getAdminFirestore } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";
import {
  defaultFooterMenu,
  defaultHeaderMenu,
  defaultHomepageSections,
  getMenu,
  getHomepageSections,
  getSiteSettings,
} from "../../../../lib/cms/settings";

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
    await requirePermission(request, "manage_navigation");
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") || "all";
    if (kind === "menus") {
      const [header, footer] = await Promise.all([getMenu("header"), getMenu("footer")]);
      return Response.json({ header, footer });
    }
    if (kind === "homepage") {
      return Response.json({ sections: await getHomepageSections() });
    }
    if (kind === "settings") {
      return Response.json({ settings: await getSiteSettings() });
    }
    const [header, footer, sections, settings] = await Promise.all([
      getMenu("header"),
      getMenu("footer"),
      getHomepageSections(),
      getSiteSettings(),
    ]);
    return Response.json({ header, footer, sections, settings });
  } catch (error) {
    return errorResponse(error, "Unable to load CMS config");
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_navigation");
    const body = (await request.json()) as {
      kind: "header" | "footer" | "homepage" | "settings";
      data: Record<string, unknown>;
    };
    const db = await getAdminFirestore();
    const now = new Date().toISOString();

    if (body.kind === "header" || body.kind === "footer") {
      const fallback = body.kind === "header" ? defaultHeaderMenu() : defaultFooterMenu();
      await db.collection(COLLECTIONS.menus).doc(body.kind).set(
        { ...fallback, ...body.data, id: body.kind, location: body.kind, updatedAt: now },
        { merge: true },
      );
    } else if (body.kind === "homepage") {
      const sections = Array.isArray(body.data.sections)
        ? body.data.sections
        : defaultHomepageSections();
      const batch = db.batch();
      for (const section of sections as { id: string }[]) {
        batch.set(
          db.collection(COLLECTIONS.homepageSections).doc(section.id),
          { ...section, updatedAt: now },
          { merge: true },
        );
      }
      await batch.commit();
    } else if (body.kind === "settings") {
      await db.collection(COLLECTIONS.siteSettings).doc("default").set(
        { ...body.data, updatedAt: now },
        { merge: true },
      );
    } else {
      return Response.json({ error: "Unknown kind" }, { status: 400 });
    }

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "cms.config",
      resourceType: body.kind,
      resourceId: body.kind,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to save CMS config");
  }
}
