"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.affiliateRedirect = exports.publishScheduledPosts = exports.submitComment = void 0;
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const scheduler_1 = require("firebase-functions/v2/scheduler");
const firebase_functions_1 = require("firebase-functions");
const zod_1 = require("zod");
admin.initializeApp();
const db = admin.firestore();
const commentSchema = zod_1.z.object({
    postId: zod_1.z.string().min(1),
    parentId: zod_1.z.string().nullable().optional(),
    displayName: zod_1.z.string().min(2).max(80),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    body: zod_1.z.string().min(2).max(4000),
    locale: zod_1.z.enum(["ar", "en"]),
    policyAccepted: zod_1.z.literal(true),
});
function sanitize(text) {
    return text
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/\son\w+\s*=/gi, "")
        .slice(0, 4000);
}
/** Secured comment submission with rate-limit headers awareness. */
exports.submitComment = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
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
exports.publishScheduledPosts = (0, scheduler_1.onSchedule)("every 5 minutes", async () => {
    const now = new Date().toISOString();
    const snap = await db
        .collection("postLocales")
        .where("status", "==", "scheduled")
        .where("scheduledAt", "<=", now)
        .limit(50)
        .get();
    if (snap.empty) {
        firebase_functions_1.logger.info("No scheduled posts to publish");
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
    firebase_functions_1.logger.info(`Published ${snap.size} scheduled locale documents`);
});
/** Affiliate redirect with click logging — mirrors Next.js /go route for Functions hosting. */
exports.affiliateRedirect = (0, https_1.onRequest)(async (req, res) => {
    const shortCode = String(req.path.split("/").filter(Boolean).pop() || "");
    if (!shortCode) {
        res.status(404).send("Not found");
        return;
    }
    const link = await db.collection("affiliateLinks").doc(shortCode).get();
    let destination = link.data()?.destinationUrl;
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
//# sourceMappingURL=index.js.map