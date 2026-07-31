import { randomUUID } from "node:crypto";
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

function slugify(value: string, fallback: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120) || fallback
  );
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "manage_navigation");
    const db = await getAdminFirestore();
    const [header, footer, sections, settings, categoriesSnap, tagsSnap] = await Promise.all([
      getMenu("header"),
      getMenu("footer"),
      getHomepageSections(),
      getSiteSettings(),
      db.collection(COLLECTIONS.categories).limit(200).get().catch(() => null),
      db.collection(COLLECTIONS.tags).limit(500).get().catch(() => null),
    ]);
    return Response.json({
      header,
      footer,
      sections,
      settings,
      categories: categoriesSnap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [],
      tags: tagsSnap?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [],
    });
  } catch (error) {
    return errorResponse(error, "Unable to load CMS config");
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_navigation");
    const body = (await request.json()) as {
      kind: "header" | "footer" | "homepage" | "settings" | "category" | "tag";
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
    } else if (body.kind === "category" || body.kind === "tag") {
      const nameAr = String(body.data.nameAr || "").trim();
      const nameEn = String(body.data.nameEn || "").trim();
      if (!nameAr && !nameEn) {
        return Response.json({ error: "Name required in at least one language" }, { status: 400 });
      }
      const id = String(body.data.id || randomUUID());
      const collection =
        body.kind === "category" ? COLLECTIONS.categories : COLLECTIONS.tags;
      const slugAr = slugify(String(body.data.slugAr || nameAr), id);
      const slugEn = slugify(String(body.data.slugEn || nameEn), id);
      await db.collection(collection).doc(id).set(
        {
          id,
          order: Number(body.data.order || 0),
          locales: {
            ar: { name: nameAr || nameEn, slug: slugAr },
            en: { name: nameEn || nameAr, slug: slugEn },
          },
          createdAt: now,
          updatedAt: now,
        },
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
