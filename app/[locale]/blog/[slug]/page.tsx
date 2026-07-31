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
import { getPostBySlug, getPostLocale } from "../../../../lib/cms/posts";
import { extractHeadingsFromHtml } from "../../../../lib/content/render-tiptap";
import {
  blogPostingJsonLd,
  breadcrumbJsonLd,
  JsonLd,
} from "../../../../lib/seo/jsonld";
import { posts as seedPosts } from "../../../../lib/data";
import { ArticleExtras } from "../../../components/ArticleExtras";
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
  let altLocalePath: string | null = null;

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
  } else {
    const other = locale === "ar" ? "en" : "ar";
    const otherLocale = await getPostLocale(found.shared.id, other).catch(() => null);
    if (otherLocale?.status === "published" && otherLocale.slug) {
      altLocalePath = localizedPath(other, `/blog/${otherLocale.slug}`);
    }
  }

  const headings = extractHeadingsFromHtml(html);
  const url = `${SITE_URL}${localizedPath(locale, `/blog/${slug}`)}`;

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
          breadcrumbJsonLd([
            { name: "fikraInAction", url: `${SITE_URL}${localizedPath(locale)}` },
            { name: t("nav.blog"), url: `${SITE_URL}${localizedPath(locale, "/blog")}` },
            { name: title!, url },
          ]),
        ]}
      />
      <ArticleExtras />

      <header className="article-hero blog-article-hero">
        <div className="container">
          <div className="blog-article-hero-inner">
            <nav className="breadcrumb blog-article-breadcrumb" aria-label="Breadcrumb">
              <Link href={localizedPath(locale)}>{t("nav.home")}</Link>
              <span>/</span>
              <Link href={localizedPath(locale, "/blog")}>{t("nav.blog")}</Link>
            </nav>
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
                {publishedAt ? (
                  <span className="blog-article-chip">
                    {t("common.published")} {publishedAt.slice(0, 10)}
                  </span>
                ) : null}
                {altLocalePath ? (
                  <Link
                    className="blog-article-chip blog-article-chip-link"
                    href={altLocalePath}
                  >
                    {t("common.viewAvailableLocale")}
                  </Link>
                ) : null}
              </div>
            </div>
            {isAffiliate && (
              <p className="affiliate-notice blog-article-affiliate">
                <strong>{t("common.footer.affiliate")}:</strong>{" "}
                {t("common.affiliateDisclosure")}
              </p>
            )}
          </div>
        </div>
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
