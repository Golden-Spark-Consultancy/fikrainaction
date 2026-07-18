import { getAdminFirestore } from "../../../lib/firebase/admin";
import { tools } from "../../../lib/data";

const SUB_ID_MAX_LENGTH = 100;

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const requestUrl = new URL(request.url);
  const tool = tools.find((item) => item.slug === slug);
  let destinationUrl = tool?.affiliateUrl;
  let subIdParam: string | undefined;
  try {
    const db = await getAdminFirestore();
    const product = await db.collection("products").doc(slug).get();
    const saved = product.data();
    if (typeof saved?.affiliateUrl === "string" && saved.affiliateUrl) destinationUrl = saved.affiliateUrl;
    if (typeof saved?.subIdParam === "string" && saved.subIdParam) subIdParam = saved.subIdParam;
  } catch { /* Static catalogue remains available if Firestore is temporarily unavailable. */ }
  if (!destinationUrl) return new Response("Unknown destination", { status: 404 });

  const campaign = requestUrl.searchParams.get("campaign");
  const position = requestUrl.searchParams.get("position");
  const gclid = requestUrl.searchParams.get("gclid");
  const msclkid = requestUrl.searchParams.get("msclkid");
  const referrer = request.headers.get("referer");

  // A compact click reference forwarded to the network as a sub-ID so that
  // network-side conversions can be reconciled with the originating ad click.
  const clickReference = (gclid ? `g_${gclid}` : msclkid ? `m_${msclkid}` : campaign ?? "").slice(0, SUB_ID_MAX_LENGTH);

  let finalUrl = destinationUrl;
  if (subIdParam && clickReference) {
    try {
      const destination = new URL(destinationUrl);
      destination.searchParams.set(subIdParam, clickReference);
      finalUrl = destination.toString();
    } catch { /* If the saved destination is not an absolute URL, redirect without a sub-ID. */ }
  }

  try {
    const db = await getAdminFirestore();
    await db.collection("affiliateClicks").add({
      productSlug: slug,
      destinationUrl: finalUrl,
      referringPage: referrer,
      campaign,
      position,
      gclid,
      msclkid,
      clickedAt: new Date(),
    });
  } catch { /* Redirect remains available if analytics storage is temporarily unavailable. */ }

  return Response.redirect(finalUrl, 302);
}
