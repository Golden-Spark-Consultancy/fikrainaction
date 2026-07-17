import { getAdminFirestore } from "../../../lib/firebase/admin";
import { tools } from "../../../lib/data";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);
  let destinationUrl = tool?.affiliateUrl;
  try {
    const db = await getAdminFirestore();
    const product = await db.collection("products").doc(slug).get();
    const savedUrl = product.data()?.affiliateUrl;
    if (typeof savedUrl === "string" && savedUrl) destinationUrl = savedUrl;
  } catch { /* Static catalogue remains available if Firestore is temporarily unavailable. */ }
  if (!destinationUrl) return new Response("Unknown destination", { status: 404 });
  const referrer = request.headers.get("referer");
  try { const db = await getAdminFirestore(); await db.collection("affiliateClicks").add({ productSlug: slug, destinationUrl, referringPage: referrer, campaign: new URL(request.url).searchParams.get("campaign"), position: new URL(request.url).searchParams.get("position"), clickedAt: new Date() }); } catch { /* Redirect remains available if analytics storage is temporarily unavailable. */ }
  return Response.redirect(destinationUrl, 302);
}
