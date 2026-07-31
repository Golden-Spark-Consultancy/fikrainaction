import { getAdminFirestore } from "../../../lib/firebase/admin";
import { tools } from "../../../lib/data";
import { COLLECTIONS, LEGACY_COLLECTIONS } from "../../../lib/cms/collections";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);
  let destinationUrl = tool?.affiliateUrl;
  let active = true;

  try {
    const db = await getAdminFirestore();
    const link = await db.collection(COLLECTIONS.affiliateLinks).doc(slug).get();
    if (link.exists) {
      const data = link.data();
      if (data?.active === false) active = false;
      if (typeof data?.destinationUrl === "string" && data.destinationUrl) {
        destinationUrl = data.destinationUrl;
      }
      if (data?.expiresAt && new Date(data.expiresAt).getTime() < Date.now()) {
        active = false;
      }
    } else {
      const product = await db.collection(LEGACY_COLLECTIONS.products).doc(slug).get();
      const savedUrl = product.data()?.affiliateUrl;
      if (typeof savedUrl === "string" && savedUrl) destinationUrl = savedUrl;
    }
  } catch {
    /* Static catalogue remains available if Firestore is temporarily unavailable. */
  }

  if (!active || !destinationUrl) {
    return new Response("Unknown or inactive destination", { status: 404 });
  }

  const referrer = request.headers.get("referer");
  const url = new URL(request.url);
  try {
    const db = await getAdminFirestore();
    await db.collection(LEGACY_COLLECTIONS.affiliateClicks).add({
      productSlug: slug,
      destinationUrl,
      referringPage: referrer,
      campaign: url.searchParams.get("campaign"),
      position: url.searchParams.get("position"),
      clickedAt: new Date(),
    });
  } catch {
    /* Redirect remains available if analytics storage is temporarily unavailable. */
  }

  return Response.redirect(destinationUrl, 302);
}
