import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";
import { slugify } from "../../../lib/generator";
import { tools } from "../../../lib/data";

type ProductPayload = {
  slug?: string;
  name?: string;
  type?: string;
  category?: string;
  description?: string;
  officialUrl?: string;
  affiliateUrl?: string;
  audience?: string;
  features?: string;
  pricing?: string;
  status?: string;
};

function errorResponse(error: unknown, fallback: string) {
  if (error instanceof FirebaseAccessError) return Response.json({ error: error.message }, { status: error.status });
  const serviceIssue = getFirebaseServiceIssue(error);
  if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
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
    const snapshot = await db.collection("products").orderBy("updatedAt", "desc").limit(200).get();
    const saved = snapshot.docs.map((document) => {
      const product = document.data();
      return { id: document.id, ...product, updatedAt: toIso(product.updatedAt), source: "firestore" };
    });
    const savedSlugs = new Set(saved.map((product) => product.id));
    const seedProducts = tools
      .filter((tool) => !savedSlugs.has(tool.slug))
      .map((tool) => ({
        id: tool.slug,
        slug: tool.slug,
        name: tool.name,
        type: "Software",
        category: tool.category,
        description: tool.description,
        officialUrl: tool.affiliateUrl,
        affiliateUrl: tool.affiliateUrl,
        audience: tool.bestFor,
        features: tool.highlights.join("\n"),
        pricing: tool.price,
        status: "active",
        updatedAt: null,
        source: "seed",
      }));
    return Response.json({ products: [...saved, ...seedProducts] });
  } catch (error) {
    return errorResponse(error, "Unable to load products");
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireFirebaseAdmin(request);
    const body = await request.json() as ProductPayload;
    const required = ["name", "category", "description", "officialUrl", "affiliateUrl"] as const;
    const missing = required.filter((field) => !body[field]?.trim());
    if (missing.length) return Response.json({ error: `Missing required fields: ${missing.join(", ")}` }, { status: 400 });
    try { new URL(body.officialUrl!); new URL(body.affiliateUrl!); } catch { return Response.json({ error: "Official and affiliate URLs must be valid web addresses." }, { status: 400 }); }

    const db = await getAdminFirestore();
    const slug = slugify(body.slug || body.name!);
    const reference = db.collection("products").doc(slug);
    const existing = await reference.get();
    const now = new Date();
    const product = {
      slug,
      name: body.name!.trim(),
      type: body.type?.trim() || "Software",
      category: body.category!.trim(),
      description: body.description!.trim(),
      officialUrl: body.officialUrl!.trim(),
      affiliateUrl: body.affiliateUrl!.trim(),
      audience: body.audience?.trim() || "",
      features: body.features?.trim() || "",
      pricing: body.pricing?.trim() || "",
      status: body.status === "draft" ? "draft" : "active",
      updatedBy: user.email || user.uid,
      updatedAt: now,
      ...(existing.exists ? {} : { createdBy: user.email || user.uid, createdAt: now }),
    };
    await reference.set(product, { merge: true });
    return Response.json({ product: { id: slug, ...product, updatedAt: now.toISOString(), source: "firestore" } }, { status: existing.exists ? 200 : 201 });
  } catch (error) {
    return errorResponse(error, "Unable to save the product");
  }
}
