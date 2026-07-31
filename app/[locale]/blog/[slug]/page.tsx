import { notFound } from "next/navigation";
import Link from "next/link";
import {
  isLocale,
  localizedPath,
  SITE_URL,
  type Locale,
} from "../../../../lib/i18n/config";
import { createTranslator } from "../../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../../lib/seo/metadata";
import { getCategoryById } from "../../../../lib/cms/categories";
import { getPostBySlug, getPostLocale } from "../../../../lib/cms/posts";
import { extractHeadingsFromHtml } from "../../../../lib/content/render-tiptap";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  JsonLd,
} from "../../../../lib/seo/jsonld";
import { posts as seedPosts } from "../../../../lib/data";
import { ArticleExtras } from "../../../components/ArticleExtras";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { CommentSection } from "../../../components/CommentSection";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const locale = raw as Locale;
  const found = await getPostBySlug(locale, slug).catch(() => null);
  if (found) {
    const other = locale === "ar" ? "en" : "ar";
    const otherLocale = await getPostLocale(found.shared.id, other).catch(() => null);
    const alternatePaths: Partial<Record<Locale, string>> = {
      [locale]: `/blog/${found.locale.slug}`,
    };
    if (otherLocale?.status === "published" && otherLocale.slug) {
      alternatePaths[other] = `/blog/${otherLocale.slug}`;
    }
    return buildPageMetadata({
      locale,
      title: found.locale.seo.title || found.locale.title,
      description: found.locale.seo.description || found.locale.excerpt,
      path: `/blog/${found.locale.slug}`,
      alternatePaths,
      type: "article",
    });
  }
  const seed = seedPosts.find((p) => p.slug === slug);
  if (seed && locale === "en") {
    return buildPageMetadata({
      locale,
      title: seed.title,
      description: seed.excerpt,
      path: `/blog/${slug}`,
      type: "article",
    });
  }
  return {};
}

export default async function BlogArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);

  const found = await getPostBySlug(locale, slug).catch(() => null);
  let title = found?.locale.title;
  let excerpt = found?.locale.excerpt ?? "";
  let html = found?.locale.renderedHtml ?? "";
  let reading = found?.locale.readingTimeMinutes ?? 5;
  let publishedAt = found?.locale.publishedAt ?? undefined;
  let isAffiliate = found?.shared.isAffiliateContent ?? false;
  let commentsEnabled = found?.shared.commentsEnabled !== false;
  let postId = found?.shared.id ?? slug;
  const thumbnailUrl = found?.shared.thumbnailUrl || "";
  const thumbnailAlt =
    found?.locale.thumbnailAlt || found?.locale.title || title || "";

  if (!found) {
    const seed = seedPosts.find((p) => p.slug === slug);
    if (!seed || locale !== "en") {
      const other = locale === "ar" ? "en" : "ar";
      // Same slug may exist in the other locale; otherwise no public match.
      const otherPost = await getPostBySlug(other, slug).catch(() => null);
      if (otherPost) {
        return (
          <main id="main-content" className="blog-article-page">
            <div className="container blog-article-shell">
              <h1>{t("common.translationUnavailable")}</h1>
              <p>
                <Link href={localizedPath(other, `/blog/${otherPost.locale.slug}`)}>
                  {t("common.viewAvailableLocale")}
                </Link>
              </p>
            </div>
          </main>
        );
      }
      notFound();
    }
    title = seed.title;
    excerpt = seed.excerpt;
    html = `<p>${seed.excerpt}</p><p>This demonstration article is reserved for editorial expansion in the fikraInAction CMS.</p>`;
  }

  const headings = extractHeadingsFromHtml(html);
  const url = `${SITE_URL}${localizedPath(locale, `/blog/${slug}`)}`;

  const crumbItems: { label: string; href?: string }[] = [
    { label: t("nav.home"), href: localizedPath(locale) },
  ];
  const jsonLdCrumbs: { name: string; url: string }[] = [
    { name: "fikraInAction", url: `${SITE_URL}${localizedPath(locale)}` },
  ];

  const primaryCategoryId = found?.shared.categoryIds?.[0];
  if (primaryCategoryId) {
    const category = await getCategoryById(primaryCategoryId).catch(() => null);
    if (category) {
      if (category.parentId) {
        const parent = await getCategoryById(category.parentId).catch(() => null);
        if (parent) {
          const parentSlug =
            parent.locales[locale]?.slug ||
            parent.locales.en?.slug ||
            parent.locales.ar?.slug ||
            parent.id;
          const parentName =
            parent.locales[locale]?.name ||
            parent.locales.en?.name ||
            parent.locales.ar?.name ||
            parent.id;
          const parentHref = localizedPath(locale, `/category/${parentSlug}`);
          crumbItems.push({ label: parentName, href: parentHref });
          jsonLdCrumbs.push({ name: parentName, url: `${SITE_URL}${parentHref}` });
        }
      }
      const catSlug =
        category.locales[locale]?.slug ||
        category.locales.en?.slug ||
        category.locales.ar?.slug ||
        category.id;
      const catName =
        category.locales[locale]?.name ||
        category.locales.en?.name ||
        category.locales.ar?.name ||
        category.id;
      const catHref = localizedPath(locale, `/category/${catSlug}`);
      crumbItems.push({ label: catName, href: catHref });
      jsonLdCrumbs.push({ name: catName, url: `${SITE_URL}${catHref}` });
    }
  }
  crumbItems.push({ label: title! });
  jsonLdCrumbs.push({ name: title!, url });

  return (
    <main id="main-content" className="blog-article-page">
      <JsonLd
        data={[
          blogPostingJsonLd({
            title: title!,
            description: excerpt,
            url,
            datePublished: publishedAt ?? undefined,
            locale,
          }),
          breadcrumbJsonLd(jsonLdCrumbs),
        ]}
      />
      <ArticleExtras />

      <header className="article-hero blog-article-hero">
        <div className="container">
          <Breadcrumbs items={crumbItems} />
        </div>

        <div
          className={`blog-article-cover${thumbnailUrl ? " has-image" : ""}`}
        >
          {thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="blog-article-cover-media"
              src={thumbnailUrl}
              alt={thumbnailAlt}
              loading="eager"
            />
          ) : (
            <span className="blog-article-cover-fallback" aria-hidden="true" />
          )}
          <span className="blog-article-cover-shade" aria-hidden="true" />
          <div className="container blog-article-cover-copy">
            <h1>{title}</h1>
            {excerpt ? <p className="blog-article-excerpt">{excerpt}</p> : null}
            <div className="blog-article-meta">
              <span className="blog-article-avatar" aria-hidden="true">
                FA
              </span>
              <div className="blog-article-meta-chips">
                <span className="blog-article-chip">
                  {t("common.readTime", { minutes: reading })}
                </span>
              </div>
            </div>
          </div>
        </div>

        {isAffiliate ? (
          <div className="container">
            <p className="affiliate-notice blog-article-affiliate">
              <strong>{t("common.footer.affiliate")}:</strong>{" "}
              {t("common.affiliateDisclosure")}
            </p>
          </div>
        ) : null}
      </header>

      <div className="container blog-article-shell">
        <div className="blog-article-layout">
          {headings.length > 0 && (
            <aside className="blog-article-toc" aria-label={t("common.tableOfContents")}>
              <strong>{t("common.tableOfContents")}</strong>
              <nav>
                <ol className="blog-article-toc-list">
                  {headings.map((h) => (
                    <li
                      key={h.id}
                      className={`blog-article-toc-item level-${h.level}`}
                    >
                      <a href={`#${h.id}`}>{h.text}</a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>
          )}
          <article className="article-body blog-article-content">
            <div
              className="blog-prose"
              dangerouslySetInnerHTML={{ __html: html }}
            />
            <CommentSection
              locale={locale}
              postId={postId}
              enabled={commentsEnabled}
            />
          </article>
        </div>
      </div>
    </main>
  );
}
