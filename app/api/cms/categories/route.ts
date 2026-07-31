import { randomUUID } from "node:crypto";
import {
  deleteCategory,
  listAllCategoriesAdmin,
  listCategories,
  upsertCategory,
} from "../../../../lib/cms/categories";
import { FirebaseAccessError, requireFirebaseAdmin } from "../../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FirebaseAccessError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
  return Response.json(
    { error: error instanceof Error ? error.message : fallback },
    { status: error instanceof Error && /required|parent|subcategor/i.test(error.message) ? 400 : 500 },
  );
}

/** List categories. Editors can read; managers get disabled rows too via ?all=1. */
export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const url = new URL(request.url);
    const all = url.searchParams.get("all") === "1";
    if (all) {
      await requirePermission(request, "manage_navigation");
      return Response.json({ categories: await listAllCategoriesAdmin() });
    }
    // Any signed-in CMS user who can edit posts may load the picker list.
    await requirePermission(request, "edit_own_content");
    return Response.json({ categories: await listCategories() });
  } catch (error) {
    return errorResponse(error, "Unable to load categories.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_navigation");
    const body = (await request.json()) as Record<string, unknown>;
    const saved = await upsertCategory({
      id: body.id ? String(body.id) : undefined,
      parentId: body.parentId === "" || body.parentId == null ? null : String(body.parentId),
      order: Number(body.order || 0),
      showInNav: body.showInNav !== false,
      icon: body.icon ? String(body.icon) : undefined,
      enabled: body.enabled !== false,
      nameAr: String(body.nameAr || ""),
      nameEn: String(body.nameEn || ""),
      slugAr: body.slugAr ? String(body.slugAr) : undefined,
      slugEn: body.slugEn ? String(body.slugEn) : undefined,
      descriptionAr: body.descriptionAr != null ? String(body.descriptionAr) : undefined,
      descriptionEn: body.descriptionEn != null ? String(body.descriptionEn) : undefined,
    });
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "cms.category.upsert",
      resourceType: "category",
      resourceId: saved.id,
    });
    return Response.json({ category: saved, id: saved.id || randomUUID() });
  } catch (error) {
    return errorResponse(error, "Unable to save category.");
  }
}

export async function PUT(request: Request) {
  return POST(request);
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_navigation");
    const url = new URL(request.url);
    const id = url.searchParams.get("id") || "";
    if (!id) return Response.json({ error: "Category id is required." }, { status: 400 });
    await deleteCategory(id);
    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "cms.category.delete",
      resourceType: "category",
      resourceId: id,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete category.");
  }
}
