import { FirebaseAccessError, getAdminFirestore, getAdminStorage, requireFirebaseAdmin } from "../../../lib/firebase/admin";

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
  return Response.json({ error: error instanceof Error ? error.message : fallback }, { status: 500 });
}

function toIso(value: unknown) {
  return value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function"
    ? (value.toDate() as Date).toISOString()
    : new Date().toISOString();
}

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const db = await getAdminFirestore();
    const snapshot = await db.collection("mediaAssets").orderBy("uploadedAt", "desc").limit(100).get();
    const assets = snapshot.docs.map((document) => ({ id: document.id, ...document.data(), uploadedAt: toIso(document.data().uploadedAt) }));
    return Response.json({ assets });
  } catch (error) {
    return errorResponse(error, "Unable to load media.");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseAdmin(request);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Choose a media file to upload." }, { status: 400 });
    if (!/^(image|video)\//.test(file.type)) return Response.json({ error: "Only image and video files are supported." }, { status: 415 });
    if (file.size > MAX_FILE_SIZE) return Response.json({ error: "Media files must be 20 MB or smaller." }, { status: 413 });

    const id = crypto.randomUUID();
    const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || "upload";
    const objectPath = `media/${new Date().getUTCFullYear()}/${id}-${safeName}`;
    const storage = await getAdminStorage();
    const object = storage.bucket().file(objectPath);
    await object.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      contentType: file.type,
      metadata: { cacheControl: "public, max-age=31536000, immutable", metadata: { uploadedBy: user.email || user.uid, originalName: file.name } },
    });

    const { getDownloadURL } = await import("firebase-admin/storage");
    const url = await getDownloadURL(object);
    const asset = { id, name: file.name, objectPath, contentType: file.type, size: file.size, url, uploadedBy: user.email || user.uid, uploadedAt: new Date() };
    const db = await getAdminFirestore();
    await db.collection("mediaAssets").doc(id).set(asset);
    return Response.json({ asset: { ...asset, uploadedAt: asset.uploadedAt.toISOString() } }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Unable to upload media.");
  }
}
