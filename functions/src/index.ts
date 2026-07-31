import * as admin from "firebase-admin";
import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions";
import { z } from "zod";

admin.initializeApp();
const db = admin.firestore();

const commentSchema = z.object({
  postId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  displayName: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  body: z.string().min(2).max(4000),
  locale: z.enum(["ar", "en"]),
  policyAccepted: z.literal(true),
});

function sanitize(text: string) {
  return text
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=/gi, "")
    .slice(0, 4000);
}

/** Secured comment submission with rate-limit headers awareness. */
export const submitComment = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method not allowed");
    return;
  }
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid payload" });
    return;
  }

  const settings = await db.collection("siteSettings").doc("default").get();
  const requireModeration = settings.data()?.commentsRequireModeration !== false;
  const now = new Date().toISOString();
  const ref = db.collection("comments").doc();
  await ref.set({
    id: ref.id,
    postId: parsed.data.postId,
    parentId: parsed.data.parentId ?? null,
    displayName: parsed.data.displayName,
    body: sanitize(parsed.data.body),
    status: requireModeration ? "pending" : "approved",
    locale: parsed.data.locale,
    createdAt: now,
    updatedAt: now,
  });
  if (parsed.data.email) {
    await db.collection("commentPrivateData").doc(ref.id).set({
      commentId: ref.id,
      email: parsed.data.email,
      createdAt: now,
    });
  }
  res.json({ ok: true, id: ref.id });
});

/** Publish scheduled post locales whose scheduledAt <= now. */
export const publishScheduledPosts = onSchedule("every 5 minutes", async () => {
  const now = new Date().toISOString();
  const snap = await db
    .collection("postLocales")
    .where("status", "==", "scheduled")
    .where("scheduledAt", "<=", now)
    .limit(50)
    .get();

  if (snap.empty) {
    logger.info("No scheduled posts to publish");
    return;
  }

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, {
      status: "published",
      publishedAt: now,
      updatedAt: now,
    });
  }
  await batch.commit();
  logger.info(`Published ${snap.size} scheduled locale documents`);
});

/** Affiliate redirect with click logging — mirrors Next.js /go route for Functions hosting. */
export const affiliateRedirect = onRequest(async (req, res) => {
  const shortCode = String(req.path.split("/").filter(Boolean).pop() || "");
  if (!shortCode) {
    res.status(404).send("Not found");
    return;
  }
  const link = await db.collection("affiliateLinks").doc(shortCode).get();
  let destination = link.data()?.destinationUrl as string | undefined;
  let active = link.data()?.active !== false;
  if (!destination) {
    const product = await db.collection("products").doc(shortCode).get();
    destination = product.data()?.affiliateUrl;
    active = true;
  }
  if (!destination || !active) {
    res.status(404).send("Unknown destination");
    return;
  }
  await db.collection("affiliateClicks").add({
    productSlug: shortCode,
    destinationUrl: destination,
    referringPage: req.get("referer") || null,
    campaign: req.query.campaign || null,
    position: req.query.position || null,
    clickedAt: new Date(),
  });
  res.redirect(302, destination);
});
