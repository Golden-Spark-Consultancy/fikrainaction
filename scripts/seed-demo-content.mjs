/**
 * Safe seed script — skips when collections already contain data.
 *
 * Usage:
 *   node scripts/seed-demo-content.mjs --dry-run
 *   node scripts/seed-demo-content.mjs
 */
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin, printAuthHelp } from "./firebase-admin-init.mjs";

const dryRun = process.argv.includes("--dry-run");

function init() {
  initFirebaseAdmin();
}

const categories = [
  { id: "artificial-intelligence", ar: "الذكاء الاصطناعي", en: "Artificial Intelligence" },
  { id: "automation", ar: "الأتمتة", en: "Automation" },
  { id: "programming", ar: "البرمجة", en: "Programming" },
  { id: "hardware", ar: "الأجهزة", en: "Hardware" },
  { id: "software", ar: "البرمجيات", en: "Software" },
  { id: "arduino", ar: "أردوينو", en: "Arduino" },
  { id: "raspberry-pi", ar: "راسبيري باي", en: "Raspberry Pi" },
  { id: "esp32", ar: "ESP32", en: "ESP32" },
  { id: "cybersecurity", ar: "الأمن السيبراني", en: "Cybersecurity" },
  { id: "tutorials", ar: "الشروحات", en: "Tutorials" },
  { id: "reviews", ar: "المراجعات", en: "Reviews" },
];

const demoContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Getting started" }] },
    { type: "paragraph", content: [{ type: "text", text: "This demonstration article exercises headings, lists, code, and callouts for fikraInAction." }] },
    { type: "bulletList", content: [
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Arabic and English are edited separately." }] }] },
      { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Code blocks keep LTR direction on RTL pages." }] }] },
    ]},
    { type: "codeBlock", attrs: { language: "typescript" }, content: [{ type: "text", text: " const greeting: string = \"Hello from fikraInAction\";\nconsole.log(greeting);" }] },
    { type: "callout", attrs: { variant: "info" }, content: [{ type: "paragraph", content: [{ type: "text", text: "Demonstration content only — will not overwrite real articles." }] }] },
  ],
};

async function main() {
  init();
  const db = getFirestore();
  const existingCats = await db.collection("categories").limit(1).get();
  if (!existingCats.empty) {
    console.log("Categories already present — skipping category seed.");
  } else {
    console.log(`${dryRun ? "[dry-run] " : ""}Seeding categories…`);
    if (!dryRun) {
      const batch = db.batch();
      categories.forEach((cat, index) => {
        batch.set(db.collection("categories").doc(cat.id), {
          id: cat.id,
          parentId: null,
          order: index,
          locales: {
            ar: { name: cat.ar, slug: cat.id, description: cat.ar },
            en: { name: cat.en, slug: cat.id, description: cat.en },
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          demo: true,
        });
      });
      await batch.commit();
    }
  }

  const existingDemo = await db.collection("posts").doc("demo-code-highlighting").get();
  if (existingDemo.exists) {
    console.log("Demo post already present — skipping.");
  } else {
    console.log(`${dryRun ? "[dry-run] " : ""}Seeding demonstration article…`);
    if (!dryRun) {
      const now = new Date().toISOString();
      await db.collection("posts").doc("demo-code-highlighting").set({
        id: "demo-code-highlighting",
        authorId: "system",
        categoryIds: ["programming", "tutorials"],
        tagIds: [],
        featured: true,
        commentsEnabled: true,
        isAffiliateContent: false,
        relatedPostIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: "system",
        updatedBy: "system",
        demo: true,
      });
      for (const locale of ["ar", "en"]) {
        const title =
          locale === "ar"
            ? "مقال تجريبي: تمييز الشفرات والمحتوى الغني"
            : "Demo article: code highlighting and rich content";
        await db.collection("postLocales").doc(`demo-code-highlighting_${locale}`).set({
          id: `demo-code-highlighting_${locale}`,
          postId: "demo-code-highlighting",
          locale,
          title,
          slug: "demo-code-highlighting",
          excerpt:
            locale === "ar"
              ? "محتوى تجريبي لاختبار العناوين والقوائم والشفرات والتنبيهات."
              : "Demonstration content for headings, lists, code blocks, and callouts.",
          content: demoContent,
          renderedHtml: "",
          searchText: title.toLowerCase(),
          seo: { title, description: title },
          status: "published",
          publishedAt: now,
          scheduledAt: null,
          readingTimeMinutes: 4,
          updatedAt: now,
          updatedBy: "system",
          demo: true,
        });
      }
    }
  }

  const settings = await db.collection("siteSettings").doc("default").get();
  if (!settings.exists) {
    console.log(`${dryRun ? "[dry-run] " : ""}Seeding site settings…`);
    if (!dryRun) {
      await db.collection("siteSettings").doc("default").set({
        defaultLocale: "ar",
        siteName: "fikraInAction",
        siteUrl: "https://fikrainaction.com",
        commentsEnabled: true,
        commentsRequireModeration: true,
        commentsAllowReplies: true,
        analyticsEnabled: true,
        marketingEnabled: false,
        branding: {},
        socialLinks: {},
        updatedAt: new Date().toISOString(),
      });
    }
  }

  console.log("Seed complete.");
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  if (/credentials|ADC|auth/i.test(message)) printAuthHelp();
  console.error(message);
  process.exit(1);
});
