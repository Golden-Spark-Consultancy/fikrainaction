import { createHash, randomUUID } from "node:crypto";
import { FirebaseAccessError, getAdminFirestore, getAdminStorage } from "../../../lib/firebase/admin";
import { requirePermission, writeAuditLog } from "../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";
import { COLLECTIONS, LEGACY_COLLECTIONS } from "../../../lib/cms/collections";
import type { LocalizedString, MediaDoc } from "../../../lib/types/cms";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ACCEPTED_TYPE_PREFIXES = ["image/", "video/"];
const ACCEPTED_EXACT_TYPES = new Set(["application/pdf", "text/plain"]);

type MediaKind = "image" | "video" | "document" | "other";
type MediaAssetView = MediaDoc & { kind: MediaKind; source: "media" | "mediaAssets" };

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

function toIso(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
    return ((value as { toDate: () => Date }).toDate()).toISOString();
  }
  if (typeof value === "string" && value) return value;
  return new Date().toISOString();
}

function classify(contentType: string): MediaKind {
  if (contentType.startsWith("image/")) return "image";
  if (contentType.startsWith("video/")) return "video";
  if (contentType === "application/pdf" || contentType === "text/plain") return "document";
  return "other";
}

function isAcceptedType(contentType: string): boolean {
  return ACCEPTED_TYPE_PREFIXES.some((prefix) => contentType.startsWith(prefix)) || ACCEPTED_EXACT_TYPES.has(contentType);
}

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const result = {} as T;
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FirestoreDocumentData = Record<string, any>;

function toAssetView(id: string, data: FirestoreDocumentData, source: "media" | "mediaAssets"): MediaAssetView {
  const contentType = String(data.contentType || "application/octet-stream");
  return {
    id,
    name: String(data.name || id),
    objectPath: String(data.objectPath || ""),
    contentType,
    size: Number(data.size) || 0,
    url: String(data.url || ""),
    width: typeof data.width === "number" ? data.width : undefined,
    height: typeof data.height === "number" ? data.height : undefined,
    alt: (data.alt as LocalizedString) || {},
    caption: (data.caption as LocalizedString) || {},
    credit: data.credit ? String(data.credit) : undefined,
    uploadedBy: String(data.uploadedBy || "unknown"),
    uploadedAt: toIso(data.uploadedAt),
    optimizedUrl: data.optimizedUrl ? String(data.optimizedUrl) : undefined,
    thumbUrl: data.thumbUrl ? String(data.thumbUrl) : undefined,
    hash: data.hash ? String(data.hash) : undefined,
    usageRefs: Array.isArray(data.usageRefs) ? (data.usageRefs as string[]) : [],
    kind: classify(contentType),
    source,
  };
}

/** Best-effort image optimization. Skips gracefully when `sharp` is unavailable (it's a dev-only transitive dependency here). */
async function tryOptimizeImage(buffer: Buffer): Promise<{
  width?: number;
  height?: number;
  optimizedBuffer: Buffer;
  thumbBuffer: Buffer;
} | null> {
  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default;
    const metadata = await sharp(buffer, { failOn: "none" }).metadata();
    const optimizedBuffer = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const thumbBuffer = await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 74 })
      .toBuffer();
    return { width: metadata.width, height: metadata.height, optimizedBuffer, thumbBuffer };
  } catch {
    return null;
  }
}

function safeFileName(name: string): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "upload"
  );
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "manage_media");
    const db = await getAdminFirestore();
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") || "").trim().toLowerCase();
    const typeParam = (url.searchParams.get("type") || "all") as MediaKind | "all";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 24));

    const [mediaSnap, legacySnap] = await Promise.all([
      db.collection(COLLECTIONS.media).orderBy("uploadedAt", "desc").limit(500).get().catch(() => null),
      db.collection(LEGACY_COLLECTIONS.mediaAssets).orderBy("uploadedAt", "desc").limit(500).get().catch(() => null),
    ]);

    const seen = new Set<string>();
    const assets: MediaAssetView[] = [];
    for (const doc of mediaSnap?.docs ?? []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      assets.push(toAssetView(doc.id, doc.data(), "media"));
    }
    for (const doc of legacySnap?.docs ?? []) {
      if (seen.has(doc.id)) continue;
      seen.add(doc.id);
      assets.push(toAssetView(doc.id, doc.data(), "mediaAssets"));
    }
    assets.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));

    const filtered = assets.filter((asset) => {
      if (typeParam !== "all" && asset.kind !== typeParam) return false;
      if (!q) return true;
      const haystack = `${asset.name} ${asset.alt.ar || ""} ${asset.alt.en || ""} ${asset.caption.ar || ""} ${asset.caption.en || ""}`.toLowerCase();
      return haystack.includes(q);
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const paged = filtered.slice(start, start + pageSize);

    return Response.json({ assets: paged, total, page, pageSize });
  } catch (error) {
    return errorResponse(error, "Unable to load media.");
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_media");
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a media file to upload." }, { status: 400 });
    if (!isAcceptedType(file.type)) {
      return Response.json(
        { error: "Only images, videos, PDF, and plain text files are supported." },
        { status: 415 },
      );
    }
    if (file.size > MAX_FILE_SIZE) return Response.json({ error: "Files must be 20 MB or smaller." }, { status: 413 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const hash = createHash("sha256").update(buffer).digest("hex");

    const db = await getAdminFirestore();
    const existingByHash = await db
      .collection(COLLECTIONS.media)
      .where("hash", "==", hash)
      .limit(1)
      .get()
      .catch(() => null);
    if (existingByHash && !existingByHash.empty) {
      const existingDoc = existingByHash.docs[0];
      return Response.json({ asset: { id: existingDoc.id, ...existingDoc.data() }, deduped: true });
    }

    const id = randomUUID();
    const year = new Date().getUTCFullYear();
    const safeName = safeFileName(file.name);
    const objectPath = `media/${year}/${id}-${safeName}`;

    const storage = await getAdminStorage();
    const bucket = storage.bucket();
    const { getDownloadURL } = await import("firebase-admin/storage");

    const object = bucket.file(objectPath);
    await object.save(buffer, {
      resumable: false,
      contentType: file.type,
      metadata: {
        cacheControl: "public, max-age=31536000, immutable",
        metadata: { uploadedBy: auth.email || auth.uid, originalName: file.name },
      },
    });
    const url = await getDownloadURL(object);

    let width: number | undefined;
    let height: number | undefined;
    let optimizedUrl: string | undefined;
    let thumbUrl: string | undefined;

    if (file.type.startsWith("image/")) {
      const optimized = await tryOptimizeImage(buffer);
      if (optimized) {
        width = optimized.width;
        height = optimized.height;
        try {
          const optimizedObject = bucket.file(`media/${year}/${id}-opt.webp`);
          await optimizedObject.save(optimized.optimizedBuffer, {
            resumable: false,
            contentType: "image/webp",
            metadata: { cacheControl: "public, max-age=31536000, immutable" },
          });
          optimizedUrl = await getDownloadURL(optimizedObject);

          const thumbObject = bucket.file(`media/${year}/${id}-thumb.webp`);
          await thumbObject.save(optimized.thumbBuffer, {
            resumable: false,
            contentType: "image/webp",
            metadata: { cacheControl: "public, max-age=31536000, immutable" },
          });
          thumbUrl = await getDownloadURL(thumbObject);
        } catch {
          // Storage upload for the optimized variants failed; the original file remains usable.
        }
      }
    }

    const now = new Date().toISOString();
    const doc: MediaDoc = stripUndefined({
      id,
      name: file.name,
      objectPath,
      contentType: file.type,
      size: file.size,
      url,
      width,
      height,
      alt: {},
      caption: {},
      uploadedBy: auth.email || auth.uid,
      uploadedAt: now,
      optimizedUrl,
      thumbUrl,
      hash,
      usageRefs: [],
    });

    await db.collection(COLLECTIONS.media).doc(id).set(doc);
    await db
      .collection(LEGACY_COLLECTIONS.mediaAssets)
      .doc(id)
      .set(
        stripUndefined({
          id,
          name: file.name,
          objectPath,
          contentType: file.type,
          size: file.size,
          url,
          uploadedBy: doc.uploadedBy,
          uploadedAt: now,
        }),
        { merge: true },
      )
      .catch(() => undefined);

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "media.upload",
      resourceType: "media",
      resourceId: id,
      details: { name: file.name, size: file.size, contentType: file.type },
    });

    return Response.json({ asset: doc }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to upload media.");
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_media");
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      alt?: LocalizedString;
      caption?: LocalizedString;
      credit?: string;
    };
    if (!body.id) return Response.json({ error: "id is required" }, { status: 400 });

    const db = await getAdminFirestore();
    const ref = db.collection(COLLECTIONS.media).doc(body.id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Media file not found." }, { status: 404 });

    const update: Record<string, unknown> = { updatedAt: new Date().toISOString(), updatedBy: auth.email || auth.uid };
    if (body.name !== undefined) update.name = body.name.trim() || snap.data()?.name;
    if (body.alt !== undefined) update.alt = body.alt;
    if (body.caption !== undefined) update.caption = body.caption;
    if (body.credit !== undefined) update.credit = body.credit;

    await ref.set(stripUndefined(update), { merge: true });
    await db
      .collection(LEGACY_COLLECTIONS.mediaAssets)
      .doc(body.id)
      .set(stripUndefined({ name: update.name }), { merge: true })
      .catch(() => undefined);

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "media.update",
      resourceType: "media",
      resourceId: body.id,
      details: { name: body.name },
    });

    const updated = await ref.get();
    return Response.json({ asset: { id: updated.id, ...updated.data() } });
  } catch (error) {
    return errorResponse(error, "Unable to update media.");
  }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requirePermission(request, "manage_media");
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const force = url.searchParams.get("force") === "true";
    if (!id) return Response.json({ error: "id is required" }, { status: 400 });

    const db = await getAdminFirestore();
    const ref = db.collection(COLLECTIONS.media).doc(id);
    const snap = await ref.get();
    if (!snap.exists) return Response.json({ error: "Media file not found." }, { status: 404 });

    const data = snap.data() as MediaDoc;
    const usageRefs = data.usageRefs || [];
    if (usageRefs.length > 0 && !force) {
      return Response.json(
        {
          error: "This media file is still referenced elsewhere. Pass force=true to delete it anyway.",
          usageRefs,
        },
        { status: 409 },
      );
    }

    const storage = await getAdminStorage();
    const bucket = storage.bucket();
    const yearMatch = data.objectPath?.match(/^media\/(\d+)\//);
    const year = yearMatch?.[1];
    const pathsToDelete = [data.objectPath, year ? `media/${year}/${id}-opt.webp` : null, year ? `media/${year}/${id}-thumb.webp` : null].filter(
      (path): path is string => Boolean(path),
    );
    await Promise.all(pathsToDelete.map((path) => bucket.file(path).delete().catch(() => undefined)));

    await ref.delete();
    await db.collection(LEGACY_COLLECTIONS.mediaAssets).doc(id).delete().catch(() => undefined);

    await writeAuditLog({
      actorUid: auth.uid,
      actorEmail: auth.email,
      action: "media.delete",
      resourceType: "media",
      resourceId: id,
      details: { forced: force, usageRefs },
    });

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Unable to delete media.");
  }
}
