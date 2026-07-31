import { getAdminFirestore } from "../firebase/admin";
import { normalizeArabicSearchText, type Locale } from "../i18n/config";
import type { PostLocale } from "../types/cms";
import { COLLECTIONS } from "./collections";
import type { PostShared } from "../types/cms";
import { listPublishedPosts } from "./posts";
import { categories, posts as seedPosts, tools } from "../data";

export type SearchHit = {
  id: string;
  title: string;
  excerpt: string;
  slug: string;
  locale: Locale;
  type: "post" | "page" | "category" | "tag" | "author" | "tool";
  score: number;
  thumbnailUrl?: string;
};

export interface SearchProvider {
  search(query: string, locale: Locale, options?: { limit?: number }): Promise<SearchHit[]>;
  suggest(query: string, locale: Locale, options?: { limit?: number }): Promise<string[]>;
}

function scoreMatch(haystack: string, needle: string): number {
  if (!needle) return 0;
  if (haystack === needle) return 100;
  if (haystack.startsWith(needle)) return 80;
  if (haystack.includes(needle)) return 50;
  const parts = needle.split(/\s+/).filter(Boolean);
  const hits = parts.filter((part) => haystack.includes(part)).length;
  return hits ? (hits / parts.length) * 40 : 0;
}

class FirestoreSearchProvider implements SearchProvider {
  async search(query: string, locale: Locale, options: { limit?: number } = {}): Promise<SearchHit[]> {
    const limit = Math.min(options.limit ?? 20, 50);
    const normalized = normalizeArabicSearchText(query);
    if (!normalized) return [];

    const hits: SearchHit[] = [];

    try {
      const db = await getAdminFirestore();
      const snap = await db
        .collection(COLLECTIONS.postLocales)
        .where("locale", "==", locale)
        .where("status", "==", "published")
        .limit(100)
        .get();

      const locales = snap.docs.map((doc) => doc.data() as PostLocale);
      const postIds = [...new Set(locales.map((p) => p.postId))];
      const sharedSnaps = await Promise.all(
        postIds.map((id) => db.collection(COLLECTIONS.posts).doc(id).get()),
      );
      const thumbs = new Map(
        sharedSnaps.map((doc) => [
          doc.id,
          doc.exists ? String((doc.data() as PostShared).thumbnailUrl || "") : "",
        ]),
      );

      for (const p of locales) {
        const hay = normalizeArabicSearchText(`${p.title} ${p.excerpt} ${p.searchText ?? ""}`);
        const score = scoreMatch(hay, normalized);
        if (score > 0) {
          hits.push({
            id: p.postId,
            title: p.title,
            excerpt: p.excerpt,
            slug: p.slug,
            locale: p.locale,
            type: "post",
            score,
            thumbnailUrl: thumbs.get(p.postId) || undefined,
          });
        }
      }
    } catch {
      const fallback = await listPublishedPosts(locale, { limit: 50 });
      for (const p of fallback) {
        const hay = normalizeArabicSearchText(`${p.title} ${p.excerpt} ${p.searchText ?? ""}`);
        const score = scoreMatch(hay, normalized);
        if (score > 0) {
          hits.push({
            id: p.postId,
            title: p.title,
            excerpt: p.excerpt,
            slug: p.slug,
            locale: p.locale,
            type: "post",
            score,
            thumbnailUrl: p.thumbnailUrl,
          });
        }
      }
    }

    for (const category of categories) {
      const hay = normalizeArabicSearchText(`${category.name} ${category.description}`);
      const score = scoreMatch(hay, normalized);
      if (score > 0) {
        hits.push({
          id: category.slug,
          title: category.name,
          excerpt: category.description,
          slug: category.slug,
          locale,
          type: "category",
          score: score * 0.9,
        });
      }
    }

    for (const tool of tools) {
      const hay = normalizeArabicSearchText(`${tool.name} ${tool.description} ${tool.category}`);
      const score = scoreMatch(hay, normalized);
      if (score > 0) {
        hits.push({
          id: tool.slug,
          title: tool.name,
          excerpt: tool.description,
          slug: tool.slug,
          locale,
          type: "tool",
          score: score * 0.85,
        });
      }
    }

    if (locale === "en") {
      for (const post of seedPosts) {
        const hay = normalizeArabicSearchText(`${post.title} ${post.excerpt}`);
        const score = scoreMatch(hay, normalized);
        if (score > 0 && !hits.some((h) => h.slug === post.slug && h.type === "post")) {
          hits.push({
            id: post.slug,
            title: post.title,
            excerpt: post.excerpt,
            slug: post.slug,
            locale,
            type: "post",
            score: score * 0.7,
          });
        }
      }
    }

    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async suggest(query: string, locale: Locale, options: { limit?: number } = {}): Promise<string[]> {
    const hits = await this.search(query, locale, { limit: options.limit ?? 8 });
    return [...new Set(hits.map((hit) => hit.title))].slice(0, options.limit ?? 8);
  }
}

/** Abstraction so Algolia (or similar) can replace Firestore later. */
export function createSearchProvider(): SearchProvider {
  return new FirestoreSearchProvider();
}
