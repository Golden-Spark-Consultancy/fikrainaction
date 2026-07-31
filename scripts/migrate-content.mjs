/**
 * Idempotent migration: legacy blogPosts → posts + postLocales.
 *
 * Usage:
 *   npm run migrate:dry-run -- --credentials path\to\serviceAccount.json
 *   npm run migrate -- --credentials path\to\serviceAccount.json
 *
 * Or set FIREBASE_SERVICE_ACCOUNT_JSON / GOOGLE_APPLICATION_CREDENTIALS.
 * Does NOT delete legacy fields/docs.
 */
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin, printAuthHelp } from "./firebase-admin-init.mjs";

const dryRun = process.argv.includes("--dry-run");

function normalizeSearch(text) {
  return String(text || "")
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

async function main() {
  initFirebaseAdmin();
  const db = getFirestore();
  const snap = await db.collection("blogPosts").get();
  console.log(`Found ${snap.size} legacy blogPosts`);
  let migrated = 0;
  let skipped = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    const postId = doc.id;
    const localeId = `${postId}_en`;
    const existing = await db.collection("postLocales").doc(localeId).get();
    if (existing.exists && existing.data()?.migratedFrom === "blogPosts") {
      skipped += 1;
      continue;
    }

    const html = String(data.html || "");
    const title = String(data.title || postId);
    const excerpt = String(data.excerpt || "");
    const now = new Date().toISOString();
    const shared = {
      id: postId,
      authorId: String(data.createdBy || "legacy"),
      categoryIds: data.category ? [String(data.category)] : [],
      tagIds: [],
      featured: false,
      commentsEnabled: true,
      isAffiliateContent: false,
      relatedPostIds: [],
      createdAt: data.createdAt?.toDate?.()?.toISOString?.() || data.createdAt || now,
      updatedAt: now,
      createdBy: String(data.createdBy || "legacy"),
      updatedBy: String(data.updatedBy || data.createdBy || "legacy"),
      migratedFrom: "blogPosts",
    };
    const locale = {
      id: localeId,
      postId,
      locale: "en",
      title,
      slug: String(data.slug || postId),
      excerpt,
      content: null,
      renderedHtml: html,
      searchText: normalizeSearch(`${title} ${excerpt} ${html.replace(/<[^>]+>/g, " ")}`),
      seo: {
        title: data.seoTitle || title,
        description: data.metaDescription || excerpt,
      },
      status: data.status || "draft",
      publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() || data.publishedAt || null,
      scheduledAt: null,
      readingTimeMinutes: Number.parseInt(String(data.readTime || "5"), 10) || 5,
      updatedAt: now,
      updatedBy: shared.updatedBy,
      migratedFrom: "blogPosts",
    };

    const reservationId = `postLocales_en_${locale.slug.toLowerCase()}`;

    console.log(`${dryRun ? "[dry-run] " : ""}migrate ${postId} → posts/${postId} + postLocales/${localeId}`);
    if (!dryRun) {
      const batch = db.batch();
      batch.set(db.collection("posts").doc(postId), shared, { merge: true });
      batch.set(db.collection("postLocales").doc(localeId), locale, { merge: true });
      batch.set(
        db.collection("slugReservations").doc(reservationId),
        {
          id: reservationId,
          collection: "postLocales",
          documentId: localeId,
          locale: "en",
          slug: locale.slug,
          createdAt: now,
        },
        { merge: true },
      );
      await batch.commit();
    }
    migrated += 1;
  }

  console.log(`Done. migrated=${migrated} skipped=${skipped} dryRun=${dryRun}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/credentials|ADC|auth/i.test(message)) printAuthHelp();
  console.error(message);
  process.exit(1);
});
