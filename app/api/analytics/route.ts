import { FirebaseAccessError, getAdminFirestore, requireFirebaseAdmin } from "../../../lib/firebase/admin";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";

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
    const snapshot = await db.collection("affiliateClicks").orderBy("clickedAt", "desc").limit(500).get();
    const clicks = snapshot.docs.map((document) => {
      const click = document.data();
      return { id: document.id, productSlug: String(click.productSlug || "unknown"), campaign: click.campaign || null, position: click.position || null, clickedAt: toIso(click.clickedAt) };
    });
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const byProduct = clicks.reduce<Record<string, number>>((summary, click) => {
      summary[click.productSlug] = (summary[click.productSlug] || 0) + 1;
      return summary;
    }, {});
    const topProducts = Object.entries(byProduct).sort((left, right) => right[1] - left[1]).slice(0, 10).map(([slug, count]) => ({ slug, count }));
    return Response.json({
      analytics: {
        totalClicks: clicks.length,
        last30Days: clicks.filter((click) => new Date(click.clickedAt).getTime() >= cutoff).length,
        topProducts,
        recentClicks: clicks.slice(0, 20),
        limitedTo: 500,
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load analytics");
  }
}
