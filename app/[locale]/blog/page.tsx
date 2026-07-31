import { notFound } from "next/navigation";
import Link from "next/link";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../lib/i18n/config";
import { createTranslator } from "../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../lib/seo/metadata";
import { listPublishedPosts } from "../../../lib/cms/posts";
import { posts as seedPosts } from "../../../lib/data";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const t = createTranslator(raw);
  return buildPageMetadata({
    locale: raw,
    title: t("nav.blog"),
    description: t("home.heroLead"),
    path: "/blog",
  });
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);
  const published = await listPublishedPosts(locale, { limit: 24 }).catch(() => []);
  const items =
    published.length > 0
      ? published
      : locale === "en"
        ? seedPosts.map((p) => ({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            readingTimeMinutes: 5,
          }))
        : [];

  return (
    <main id="main-content" className="container" style={{ paddingBlock: "64px" }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("nav.blog")}</h1>
      {items.length === 0 ? (
        <p className="empty-state">{t("common.noResults")}</p>
      ) : (
        <div className="post-grid" style={{ marginTop: 32 }}>
          {items.map((post) => (
            <article className="post-card" key={post.slug}>
              <h2>
                <Link href={localizedPath(locale, `/blog/${post.slug}`)}>
                  {post.title}
                </Link>
              </h2>
              <p>{post.excerpt}</p>
              <Link href={localizedPath(locale, `/blog/${post.slug}`)}>
                {t("common.readMore")} →
              </Link>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
