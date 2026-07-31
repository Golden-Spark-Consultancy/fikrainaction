import { notFound } from "next/navigation";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../lib/i18n/config";
import { createTranslator } from "../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../lib/seo/metadata";
import { listPublishedPosts } from "../../../lib/cms/posts";
import { posts as seedPosts } from "../../../lib/data";
import { PostCard } from "../../components/PostCard";

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
      ? published.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          thumbnailUrl: p.thumbnailUrl,
          thumbnailAlt: p.thumbnailAlt || p.title,
        }))
      : locale === "en"
        ? seedPosts.map((p) => ({
            slug: p.slug,
            title: p.title,
            excerpt: p.excerpt,
            thumbnailUrl: undefined as string | undefined,
            thumbnailAlt: p.title,
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
            <PostCard
              key={post.slug}
              href={localizedPath(locale, `/blog/${post.slug}`)}
              title={post.title}
              thumbnailUrl={post.thumbnailUrl}
              thumbnailAlt={post.thumbnailAlt}
              excerpt={post.excerpt}
              readMoreLabel={`${t("common.readMore")} →`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
