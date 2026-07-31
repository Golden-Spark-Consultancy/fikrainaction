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
  const found = await getPostBySlug(raw, slug).catch(() => null);
  if (found) {
    return buildPageMetadata({
      locale: raw,
      title: found.locale.seo.title || found.locale.title,
      description: found.locale.seo.description || found.locale.excerpt,
      path: `/blog/${slug}`,
      type: "article",
    });
  }
  const seed = seedPosts.find((p) => p.slug === slug);
  if (seed && raw === "en") {
    return buildPageMetadata({
      locale: raw,
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
  let altLocaleAvailable = false;

  if (!found) {
    const seed = seedPosts.find((p) => p.slug === slug);
    if (!seed || locale !== "en") {
      const other = locale === "ar" ? "en" : "ar";
      const otherPost = await getPostBySlug(other, slug).catch(() => null);
      if (otherPost) {
        return (
          <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
            <h1>{t("common.translationUnavailable")}</h1>
            <p>
              <Link href={localizedPath(other, `/blog/${slug}`)}>
                {t("common.viewAvailableLocale")}
              </Link>
            </p>
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
    altLocaleAvailable = Boolean(await getPostLocale(found.shared.id, other).catch(() => null));
  }

  const headings = extractHeadingsFromHtml(html);
  const url = `${SITE_URL}${localizedPath(locale, `/blog/${slug}`)}`;

  return (
    <main id="main-content">
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
      <header className="article-hero">
        <div className="narrow">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <Link href={localizedPath(locale)}>{t("nav.home")}</Link>
            <span>/</span>
            <Link href={localizedPath(locale, "/blog")}>{t("nav.blog")}</Link>
            <span>/</span>
            <strong>{title}</strong>
          </nav>
          <p className="micro-label">fikraInAction</p>
          <h1>{title}</h1>
          <p>{excerpt}</p>
          <p className="author-line">
            <span>FA</span>
            <span>
              {t("common.readTime", { minutes: reading })}
              {publishedAt ? ` · ${t("common.published")} ${publishedAt.slice(0, 10)}` : ""}
            </span>
          </p>
          {altLocaleAvailable && (
            <p>
              <Link href={localizedPath(locale === "ar" ? "en" : "ar", `/blog/${slug}`)}>
                {t("common.viewAvailableLocale")}
              </Link>
            </p>
          )}
          {isAffiliate && (
            <p className="affiliate-notice">
              <strong>{t("common.footer.affiliate")}:</strong> {t("common.affiliateDisclosure")}
            </p>
          )}
        </div>
      </header>
      <div className="container article-layout">
        <article className="article-body">
          {headings.length > 0 && (
            <nav className="policy-toc" aria-label={t("common.tableOfContents")}>
              <strong>{t("common.tableOfContents")}</strong>
              {headings.map((h) => (
                <a key={h.id} href={`#${h.id}`}>
                  {h.text}
                </a>
              ))}
            </nav>
          )}
          <div dangerouslySetInnerHTML={{ __html: html }} />
          <CommentSection
            locale={locale}
            postId={postId}
            enabled={commentsEnabled}
          />
        </article>
      </div>
    </main>
  );
}
