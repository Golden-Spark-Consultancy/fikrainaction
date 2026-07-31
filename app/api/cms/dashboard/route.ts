import { FirebaseAccessError, getAdminFirestore } from "../../../../lib/firebase/admin";
import { requirePermission } from "../../../../lib/firebase/authz";
import { getFirebaseServiceIssue } from "../../../../lib/firebase/service-errors";
import { COLLECTIONS } from "../../../../lib/cms/collections";

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

async function countWhere(collection: string, field: string, value: string): Promise<number> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.collection(collection).where(field, "==", value).limit(500).get();
    return snap.size;
  } catch {
    return 0;
  }
}

export async function GET(request: Request) {
  try {
    await requirePermission(request, "manage_content");
    const db = await getAdminFirestore();

    const [
      published,
      drafts,
      inReview,
      scheduled,
      archived,
      pendingComments,
      spamComments,
      mediaSnap,
      localesSnap,
      aiBatchesSnap,
      aiFailedSnap,
      recentCommentsSnap,
    ] = await Promise.all([
      countWhere(COLLECTIONS.postLocales, "status", "published"),
      countWhere(COLLECTIONS.postLocales, "status", "draft"),
      countWhere(COLLECTIONS.postLocales, "status", "in_review"),
      countWhere(COLLECTIONS.postLocales, "status", "scheduled"),
      countWhere(COLLECTIONS.postLocales, "status", "archived"),
      countWhere(COLLECTIONS.comments, "status", "pending"),
      countWhere(COLLECTIONS.comments, "status", "spam"),
      db.collection(COLLECTIONS.media).limit(500).get().catch(() =>
        db.collection("mediaAssets").limit(500).get().catch(() => null),
      ),
      db.collection(COLLECTIONS.postLocales).orderBy("updatedAt", "desc").limit(200).get().catch(() => null),
      db.collection(COLLECTIONS.aiBatches).limit(100).get().catch(() => null),
      countWhere(COLLECTIONS.aiBatchItems, "status", "failed"),
      db.collection(COLLECTIONS.comments).orderBy("createdAt", "desc").limit(8).get().catch(() => null),
    ]);

    const byPost = new Map<string, Set<string>>();
    for (const doc of localesSnap?.docs ?? []) {
      const data = doc.data();
      const set = byPost.get(data.postId) || new Set<string>();
      set.add(data.locale);
      byPost.set(data.postId, set);
    }
    let missingTranslations = 0;
    for (const locales of byPost.values()) {
      if (!(locales.has("ar") && locales.has("en"))) missingTranslations += 1;
    }

    const recentActivity = await db
      .collection(COLLECTIONS.auditLogs)
      .orderBy("createdAt", "desc")
      .limit(15)
      .get()
      .catch(() => null);

    return Response.json({
      dashboard: {
        totalArticles: byPost.size || published + drafts + inReview + scheduled + archived,
        published,
        drafts,
        inReview,
        scheduled,
        archived,
        missingTranslations,
        pendingComments,
        spamComments,
        mediaCount: mediaSnap?.size ?? 0,
        aiBatches: aiBatchesSnap?.size ?? 0,
        aiFailedItems: aiFailedSnap,
        recentPosts:
          localesSnap?.docs.slice(0, 8).map((d) => {
            const data = d.data();
            return {
              id: data.postId || d.id,
              title: data.title,
              status: data.status,
              locale: data.locale,
              updatedAt: data.updatedAt,
            };
          }) ?? [],
        recentComments:
          recentCommentsSnap?.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              displayName: data.displayName,
              status: data.status,
              createdAt: data.createdAt,
            };
          }) ?? [],
        recentActivity:
          recentActivity?.docs.map((d) => ({ id: d.id, ...d.data() })) ?? [],
      },
    });
  } catch (error) {
    return errorResponse(error, "Unable to load dashboard");
  }
}
