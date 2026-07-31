/**
 * Upsert the canonical navbar category tree into Firestore.
 *
 * Usage:
 *   node scripts/sync-nav-categories.mjs
 *   node scripts/sync-nav-categories.mjs --dry-run
 */
import { getFirestore } from "firebase-admin/firestore";
import { initFirebaseAdmin, printAuthHelp } from "./firebase-admin-init.mjs";

const dryRun = process.argv.includes("--dry-run");

const NAV_TAXONOMY = [
  { id: "ai-automation", parentId: null, order: 10, icon: "ai", nameAr: "الذكاء والأتمتة", nameEn: "AI & Automation", slug: "ai-automation" },
  { id: "artificial-intelligence", parentId: "ai-automation", order: 11, icon: "ai", nameAr: "الذكاء الاصطناعي", nameEn: "Artificial Intelligence", slug: "artificial-intelligence" },
  { id: "automation", parentId: "ai-automation", order: 12, icon: "automation", nameAr: "الأتمتة", nameEn: "Automation", slug: "automation" },
  { id: "software-group", parentId: null, order: 20, icon: "software", nameAr: "البرمجيات", nameEn: "Software", slug: "software-group" },
  { id: "software", parentId: "software-group", order: 21, icon: "software", nameAr: "البرمجيات", nameEn: "Software", slug: "software" },
  { id: "programming", parentId: "software-group", order: 22, icon: "programming", nameAr: "البرمجة", nameEn: "Programming", slug: "programming" },
  { id: "hardware-group", parentId: null, order: 30, icon: "hardware", nameAr: "الأجهزة", nameEn: "Hardware", slug: "hardware-group" },
  { id: "hardware", parentId: "hardware-group", order: 31, icon: "hardware", nameAr: "الأجهزة", nameEn: "Hardware", slug: "hardware" },
  { id: "arduino", parentId: "hardware-group", order: 32, icon: "arduino", nameAr: "أردوينو", nameEn: "Arduino", slug: "arduino" },
  { id: "raspberry-pi", parentId: "hardware-group", order: 33, icon: "raspberry-pi", nameAr: "راسبيري باي", nameEn: "Raspberry Pi", slug: "raspberry-pi" },
  { id: "esp32", parentId: "hardware-group", order: 34, icon: "esp32", nameAr: "ESP32", nameEn: "ESP32", slug: "esp32" },
  { id: "guides", parentId: null, order: 40, icon: "guides", nameAr: "شروحات ومراجعات", nameEn: "Guides & Reviews", slug: "guides" },
  { id: "tutorials", parentId: "guides", order: 41, icon: "tutorials", nameAr: "شروحات", nameEn: "Tutorials", slug: "tutorials" },
  { id: "reviews", parentId: "guides", order: 42, icon: "reviews", nameAr: "مراجعات", nameEn: "Reviews", slug: "reviews" },
];

async function main() {
  initFirebaseAdmin();
  const db = getFirestore();
  const now = new Date().toISOString();
  console.log(`${dryRun ? "[dry-run] " : ""}Syncing ${NAV_TAXONOMY.length} navbar categories…`);

  if (!dryRun) {
    const batch = db.batch();
    for (const node of NAV_TAXONOMY) {
      batch.set(
        db.collection("categories").doc(node.id),
        {
          id: node.id,
          parentId: node.parentId,
          order: node.order,
          showInNav: true,
          icon: node.icon,
          enabled: true,
          locales: {
            ar: { name: node.nameAr, slug: node.slug, description: node.nameAr },
            en: { name: node.nameEn, slug: node.slug, description: node.nameEn },
          },
          updatedAt: now,
        },
        { merge: true },
      );
    }
    batch.set(db.collection("categories").doc("cybersecurity"), { showInNav: false, updatedAt: now }, { merge: true });
    batch.set(db.collection("categories").doc("rpi"), { parentId: "hardware-group", showInNav: false, enabled: false, updatedAt: now }, { merge: true });
    await batch.commit();
  }

  for (const node of NAV_TAXONOMY) {
    const label = node.parentId ? `  └ ${node.id}` : node.id;
    console.log(`- ${label} (${node.nameEn})`);
  }
  console.log("Done. Navbar will read these from the Categories collection.");
}

main().catch((error) => {
  console.error(error);
  printAuthHelp();
  process.exit(1);
});
