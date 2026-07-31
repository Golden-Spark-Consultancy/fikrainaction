import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "../../../../lib/cms/categories";
import { listPublishedPosts } from "../../../../lib/cms/posts";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../../lib/i18n/config";
import { createTranslator } from "../../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../../lib/seo/metadata";
import { categories as legacyCategories, tools } from "../../../../lib/data";
import { PostCard } from "../../../components/PostCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const cms = await getCategoryBySlug(locale, slug).catch(() => null);
  const legacy = legacyCategories.find((c) => c.slug === slug);
  return buildPageMetadata({
    locale,
    title: cms?.locales[locale]?.name || cms?.locales.en?.name || legacy?.name || slug,
    description:
      cms?.locales[locale]?.description ||
      cms?.locales.en?.description ||
      legacy?.description ||
      "",
    path: `/category/${slug}`,
  });
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);

  const cms = await getCategoryBySlug(locale, slug).catch(() => null);
  const legacy = legacyCategories.find((c) => c.slug === slug);
  if (!cms && !legacy) notFound();

  const title =
    cms?.locales[locale]?.name || cms?.locales.en?.name || legacy?.name || slug;
  const description =
    cms?.locales[locale]?.description ||
    cms?.locales.en?.description ||
    legacy?.description ||
    t("home.exploreCategories");

  const posts = cms
    ? await listPublishedPosts(locale, { limit: 24, categoryId: cms.id }).catch(() => [])
    : [];

  const relatedTools = tools.filter((tool) =>
    tool.category.toLowerCase().includes(title.split(" ")[0].toLowerCase()),
  );

  return (
    <main id="main-content">
      <section className="category-hero">
        <div className="container">
          <p className="micro-label">fikraInAction</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </section>

      <section className="section container">
        <h2 style={{ marginBottom: 18 }}>{t("nav.blog")}</h2>
        {posts.length === 0 ? (
          <p>{t("common.noResults")}</p>
        ) : (
          <div className="post-grid">
            {posts.map((post) => (
              <PostCard
                key={`${post.postId}-${post.locale}`}
                href={localizedPath(locale, `/blog/${post.slug}`)}
                title={post.title}
                thumbnailUrl={post.thumbnailUrl}
                thumbnailAlt={post.thumbnailAlt || post.title}
                excerpt={post.excerpt}
                readMoreLabel={`${t("common.readMore")} →`}
              />
            ))}
          </div>
        )}
      </section>

      {relatedTools.length > 0 && (
        <section className="section container">
          <h2 style={{ marginBottom: 18 }}>{t("nav.tools")}</h2>
          <div className="tool-grid">
            {relatedTools.map((tool) => (
              <article className="tool-card" key={tool.slug}>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <Link href={localizedPath(locale, `/tools/${tool.slug}`)}>
                  {t("common.readMore")} →
                </Link>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
