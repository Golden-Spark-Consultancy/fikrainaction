import { getAdminFirestore } from "../../../lib/firebase/admin";
import { tools } from "../../../lib/data";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const tool = tools.find((item) => item.slug === slug);
  if (!tool) return new Response("Unknown destination", { status: 404 });
  const referrer = request.headers.get("referer");
  try { const db = await getAdminFirestore(); await db.collection("affiliateClicks").add({ productSlug: slug, destinationUrl: tool.affiliateUrl, referringPage: referrer, campaign: new URL(request.url).searchParams.get("campaign"), position: new URL(request.url).searchParams.get("position"), clickedAt: new Date() }); } catch { /* Redirect remains available if analytics storage is temporarily unavailable. */ }
  return Response.redirect(tool.affiliateUrl, 302);
}
