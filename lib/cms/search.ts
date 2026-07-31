import { getAdminFirestore } from "../firebase/admin";
import { normalizeArabicSearchText, type Locale } from "../i18n/config";
import type { PostLocale } from "../types/cms";
import { COLLECTIONS } from "./collections";
import { listPublishedPosts } from "./posts";

export type SearchHit = {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  locale: Locale;
  type: "post" | "page" | "category" | "tag" | "author";
};

export interface SearchProvider {
  search(query: string, locale: Locale, options?: { limit?: number }): Promise<SearchHit[]>;
}

class FirestoreSearchProvider implements SearchProvider {
  async search(query: string, locale: Locale, options: { limit?: number } = {}): Promise<SearchHit[]> {
    const limit = Math.min(options.limit ?? 20, 50);
    const normalized = normalizeArabicSearchText(query);
    if (!normalized) return [];

    try {
      const db = await getAdminFirestore();
      const snap = await db
        .collection(COLLECTIONS.postLocales)
        .where("locale", "==", locale)
        .where("status", "==", "published")
        .limit(100)
        .get();

      const hits = snap.docs
        .map((d) => d.data() as PostLocale)
        .filter((p) => p.searchText?.includes(normalized) || normalizeArabicSearchText(p.title).includes(normalized))
        .slice(0, limit)
        .map((p) => ({
          id: p.postId,
          title: p.title,
          excerpt: p.excerpt,
          slug: p.slug,
          locale: p.locale,
          type: "post" as const,
        }));

      if (hits.length) return hits;
    } catch {
      /* fall through */
    }

    const fallback = await listPublishedPosts(locale, { limit: 50 });
    return fallback
      .filter((p) => {
        const hay = normalizeArabicSearchText(`${p.title} ${p.excerpt} ${p.searchText ?? ""}`);
        return hay.includes(normalized);
      })
      .slice(0, limit)
      .map((p) => ({
        id: p.postId,
        title: p.title,
        excerpt: p.excerpt,
        slug: p.slug,
        locale: p.locale,
        type: "post" as const,
      }));
  }
}

/** Abstraction so Algolia (or similar) can replace Firestore later. */
export function createSearchProvider(): SearchProvider {
  return new FirestoreSearchProvider();
}
