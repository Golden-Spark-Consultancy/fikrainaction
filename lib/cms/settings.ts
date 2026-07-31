import { getAdminFirestore } from "../firebase/admin";
import type { HomepageSection, MenuDoc, SiteSettings } from "../types/cms";
import { COLLECTIONS } from "./collections";

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.collection(COLLECTIONS.siteSettings).doc("default").get();
    if (snap.exists) return snap.data() as SiteSettings;
  } catch {
    /* Fall through to defaults when Firestore is unavailable. */
  }
  return {
    defaultLocale: "ar",
    siteName: "fikraInAction",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://fikrainaction.com",
    commentsEnabled: true,
    commentsRequireModeration: true,
    commentsCloseAfterDays: null,
    commentsAllowReplies: true,
    analyticsEnabled: true,
    marketingEnabled: false,
    branding: {},
    socialLinks: {},
    updatedAt: new Date().toISOString(),
  };
}

export function defaultHeaderMenu(): MenuDoc {
  return {
    id: "header",
    location: "header",
    updatedAt: new Date().toISOString(),
    items: [
      { id: "home", label: { ar: "الرئيسية", en: "Home" }, href: "/", enabled: true },
      { id: "ai", label: { ar: "الذكاء الاصطناعي", en: "Artificial Intelligence" }, href: "/category/artificial-intelligence", enabled: true },
      { id: "automation", label: { ar: "الأتمتة", en: "Automation" }, href: "/category/automation", enabled: true },
      { id: "programming", label: { ar: "البرمجة", en: "Programming" }, href: "/category/programming", enabled: true },
      { id: "hardware", label: { ar: "الأجهزة", en: "Hardware" }, href: "/category/hardware", enabled: true },
      { id: "software", label: { ar: "البرمجيات", en: "Software" }, href: "/category/software", enabled: true },
      { id: "arduino", label: { ar: "أردوينو", en: "Arduino" }, href: "/category/arduino", enabled: true },
      { id: "rpi", label: { ar: "راسبيري باي", en: "Raspberry Pi" }, href: "/category/raspberry-pi", enabled: true },
      { id: "esp32", label: { ar: "ESP32", en: "ESP32" }, href: "/category/esp32", enabled: true },
      { id: "tutorials", label: { ar: "شروحات", en: "Tutorials" }, href: "/category/tutorials", enabled: true },
      { id: "reviews", label: { ar: "مراجعات", en: "Reviews" }, href: "/category/reviews", enabled: true },
      { id: "about", label: { ar: "من نحن", en: "About" }, href: "/about", enabled: true },
    ],
  };
}

export function defaultFooterMenu(): MenuDoc {
  return {
    id: "footer",
    location: "footer",
    updatedAt: new Date().toISOString(),
    items: [
      { id: "privacy", label: { ar: "سياسة الخصوصية", en: "Privacy Policy" }, href: "/privacy", enabled: true },
      { id: "terms", label: { ar: "الشروط والأحكام", en: "Terms and Conditions" }, href: "/terms", enabled: true },
      { id: "cookies", label: { ar: "ملفات تعريف الارتباط", en: "Cookie Policy" }, href: "/cookies", enabled: true },
      { id: "affiliate", label: { ar: "إفصاح الشراكة", en: "Affiliate Disclosure" }, href: "/affiliate-disclosure", enabled: true },
      { id: "editorial", label: { ar: "السياسة التحريرية", en: "Editorial Policy" }, href: "/editorial-policy", enabled: true },
      { id: "comments", label: { ar: "سياسة التعليقات", en: "Comment Policy" }, href: "/comment-policy", enabled: true },
      { id: "a11y", label: { ar: "إمكانية الوصول", en: "Accessibility Statement" }, href: "/accessibility", enabled: true },
      { id: "contact", label: { ar: "تواصل معنا", en: "Contact" }, href: "/contact", enabled: true },
    ],
  };
}

export async function getMenu(location: "header" | "footer"): Promise<MenuDoc> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.collection(COLLECTIONS.menus).doc(location).get();
    if (snap.exists) return snap.data() as MenuDoc;
  } catch {
    /* defaults */
  }
  return location === "header" ? defaultHeaderMenu() : defaultFooterMenu();
}

export function defaultHomepageSections(): HomepageSection[] {
  return [
    { id: "announcement", type: "announcement", enabled: false, order: 0, heading: { ar: "إعلان", en: "Announcement" }, config: {} },
    { id: "featured", type: "featured", enabled: true, order: 1, heading: { ar: "مقال مميز", en: "Featured" }, config: { count: 1 } },
    { id: "secondary", type: "secondary_featured", enabled: true, order: 2, heading: { ar: "مختارات", en: "More featured" }, config: { count: 3 } },
    { id: "latest", type: "latest", enabled: true, order: 3, heading: { ar: "أحدث المقالات", en: "Latest articles" }, config: { count: 6 } },
    { id: "popular", type: "popular", enabled: true, order: 4, heading: { ar: "الأكثر قراءة", en: "Popular" }, config: { count: 4 } },
    { id: "categories", type: "categories", enabled: true, order: 5, heading: { ar: "التصنيفات", en: "Categories" }, config: {} },
    { id: "ai", type: "category_rail", enabled: true, order: 6, heading: { ar: "الذكاء الاصطناعي والأتمتة", en: "AI and automation" }, config: { categorySlug: "artificial-intelligence" } },
    { id: "programming", type: "category_rail", enabled: true, order: 7, heading: { ar: "شروحات البرمجة", en: "Programming tutorials" }, config: { categorySlug: "programming" } },
    { id: "hardware", type: "category_rail", enabled: true, order: 8, heading: { ar: "الأجهزة والمشاريع", en: "Hardware and maker projects" }, config: { categorySlug: "hardware" } },
    { id: "makers", type: "category_rail", enabled: true, order: 9, heading: { ar: "أردوينو وراسبيري باي وESP32", en: "Arduino, Raspberry Pi, and ESP32" }, config: { categorySlug: "arduino" } },
    { id: "software", type: "category_rail", enabled: true, order: 10, heading: { ar: "البرمجيات والأدوات", en: "Software and tools" }, config: { categorySlug: "software" } },
    { id: "reviews", type: "category_rail", enabled: true, order: 11, heading: { ar: "مراجعات ومقارنات", en: "Reviews and comparisons" }, config: { categorySlug: "reviews" } },
    { id: "affiliates", type: "affiliates", enabled: true, order: 12, heading: { ar: "أدوات موصى بها", en: "Recommended tools" }, config: { count: 3 } },
    { id: "newsletter", type: "newsletter", enabled: true, order: 13, heading: { ar: "النشرة البريدية", en: "Newsletter" }, config: {} },
  ];
}

export async function getHomepageSections(): Promise<HomepageSection[]> {
  try {
    const db = await getAdminFirestore();
    const snap = await db.collection(COLLECTIONS.homepageSections).orderBy("order").get();
    if (!snap.empty) return snap.docs.map((d) => d.data() as HomepageSection);
  } catch {
    /* defaults */
  }
  return defaultHomepageSections();
}
