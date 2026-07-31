import { getAdminFirestore } from "../firebase/admin";
import type { Locale } from "../types/cms";
import { COLLECTIONS } from "./collections";

const ARABIC_MAP: Record<string, string> = {
  ا: "a", أ: "a", إ: "i", آ: "a", ب: "b", ت: "t", ث: "th", ج: "j", ح: "h",
  خ: "kh", د: "d", ذ: "dh", ر: "r", ز: "z", س: "s", ش: "sh", ص: "s", ض: "d",
  ط: "t", ظ: "z", ع: "a", غ: "gh", ف: "f", ق: "q", ك: "k", ل: "l", م: "m",
  ن: "n", ه: "h", و: "w", ي: "y", ى: "a", ة: "h", ء: "", ئ: "y", ؤ: "w",
};

export function slugify(input: string, locale: Locale = "en"): string {
  let text = input.trim().toLowerCase();
  if (locale === "ar") {
    text = [...text].map((ch) => ARABIC_MAP[ch] ?? ch).join("");
  }
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 180) || "item";
}

function reservationId(collection: string, locale: Locale, slug: string) {
  return `${collection}_${locale}_${slug.toLowerCase()}`;
}

export async function reserveSlug(options: {
  collection: string;
  documentId: string;
  locale: Locale;
  slug: string;
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  const slug = slugify(options.slug, options.locale);
  if (!slug) return { ok: false, reason: "Invalid slug" };
  const db = await getAdminFirestore();
  const id = reservationId(options.collection, options.locale, slug);
  const ref = db.collection(COLLECTIONS.slugReservations).doc(id);

  try {
    await db.runTransaction(async (tx) => {
      const existing = await tx.get(ref);
      if (existing.exists) {
        const owner = existing.data()?.documentId;
        if (owner && owner !== options.documentId) {
          throw new Error("SLUG_TAKEN");
        }
      }
      tx.set(
        ref,
        {
          id,
          collection: options.collection,
          documentId: options.documentId,
          locale: options.locale,
          slug,
          createdAt: new Date().toISOString(),
        },
        { merge: true },
      );
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "SLUG_TAKEN") {
      return { ok: false, reason: "Slug already reserved" };
    }
    throw error;
  }
}

export async function releaseSlug(collection: string, locale: Locale, slug: string) {
  const db = await getAdminFirestore();
  const id = reservationId(collection, locale, slugify(slug, locale));
  await db.collection(COLLECTIONS.slugReservations).doc(id).delete().catch(() => undefined);
}

export async function createRedirect(fromPath: string, toPath: string, statusCode: 301 | 302 = 301) {
  const db = await getAdminFirestore();
  const id = Buffer.from(fromPath).toString("base64url").slice(0, 64);
  await db.collection(COLLECTIONS.redirects).doc(id).set(
    {
      id,
      fromPath,
      toPath,
      statusCode,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
