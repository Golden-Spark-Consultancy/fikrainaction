import { notFound } from "next/navigation";
import { getCategoryById, getCategoryBySlug } from "../../../../lib/cms/categories";
import { listPublishedPosts } from "../../../../lib/cms/posts";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../../lib/i18n/config";
import { createTranslator } from "../../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../../lib/seo/metadata";
import { categories as legacyCategories } from "../../../../lib/data";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { PostCard } from "../../../components/PostCard";

function categoryLabel(cat: { locales: { ar?: { name?: string }; en?: { name?: string } }; id: string }, locale: Locale) {
  return cat.locales[locale]?.name || cat.locales.en?.name || cat.locales.ar?.name || cat.id;
}

function categorySlug(cat: { locales: { ar?: { slug?: string }; en?: { slug?: string } }; id: string }, locale: Locale) {
  return cat.locales[locale]?.slug || cat.locales.en?.slug || cat.locales.ar?.slug || cat.id;
}

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

  const posts = cms
    ? await listPublishedPosts(locale, { limit: 24, categoryId: cms.id }).catch(() => [])
    : [];

  const crumbs = [{ label: t("nav.home"), href: localizedPath(locale) }];
  if (cms?.parentId) {
    const parent = await getCategoryById(cms.parentId).catch(() => null);
    if (parent) {
      crumbs.push({
        label: categoryLabel(parent, locale),
        href: localizedPath(locale, `/category/${categorySlug(parent, locale)}`),
      });
    }
  }
  crumbs.push({ label: title });

  return (
    <main id="main-content" className="category-page">
      <div className="container">
        <Breadcrumbs items={crumbs} />
      </div>

      <section className="section container category-posts">
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
    </main>
  );
}
