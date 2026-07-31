import Link from "next/link";
import { categories, posts, tools } from "../../lib/data";
import { getHomepageSections } from "../../lib/cms/settings";
import { listPublishedPosts } from "../../lib/cms/posts";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";
import { buildPageMetadata } from "../../lib/seo/metadata";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "../../lib/seo/jsonld";
import { notFound } from "next/navigation";
import { PostCard } from "../components/PostCard";

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
    title: `fikraInAction — ${t("tagline")}`,
    description: t("home.heroLead"),
    path: "/",
  });
}

export default async function LocaleHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);
  const sections = await getHomepageSections();
  const published = await listPublishedPosts(locale, { limit: 6 }).catch(() => []);
  const latest =
    published.length > 0
      ? published.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          readingTimeMinutes: p.readingTimeMinutes || 5,
          thumbnailUrl: p.thumbnailUrl as string | undefined,
          thumbnailAlt: (p.thumbnailAlt || p.title) as string,
        }))
      : posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          readingTimeMinutes: Number(p.readTime) || 5,
          thumbnailUrl: undefined as string | undefined,
          thumbnailAlt: p.title,
        }));
  const featuredTool = tools[0];

  return (
    <main id="main-content">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      <section className="hero-shell">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span /> fikraInAction
            </div>
            <h1>{t("home.heroTitle")}</h1>
            <p className="hero-lead">{t("home.heroLead")}</p>
            <form className="hero-search" action={localizedPath(locale, "/search")}>
              <span aria-hidden="true">⌕</span>
              <label className="sr-only" htmlFor="hero-search">
                {t("nav.search")}
              </label>
              <input
                id="hero-search"
                name="q"
                placeholder={t("common.searchPlaceholder")}
              />
              <button type="submit">
                {t("nav.search")} <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
          <div className="hero-showcase" aria-label={t("home.featured")}>
            <article className="spotlight-card">
              <div className="spotlight-top">
                <span className={`logo-tile ${featuredTool.logoClass}`}>
                  {featuredTool.logo}
                </span>
                <span className="pick-badge">{t("home.featured")}</span>
              </div>
              <p className="micro-label">{featuredTool.category}</p>
              <h2>{featuredTool.name}</h2>
              <p>{featuredTool.description}</p>
              <Link
                className="spotlight-link"
                href={localizedPath(locale, `/tools/${featuredTool.slug}`)}
              >
                {t("common.readMore")} <span>↗</span>
              </Link>
            </article>
          </div>
        </div>
      </section>

      {sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.order - b.order)
        .map((section) => {
          if (section.type === "categories") {
            return (
              <section className="section container" key={section.id}>
                <div className="section-heading">
                  <div>
                    <p className="micro-label">fikraInAction</p>
                    <h2>{section.heading[locale] || t("home.exploreCategories")}</h2>
                  </div>
                </div>
                <div className="category-card-grid">
                  {categories.map((category) => (
                    <Link
                      className="category-card"
                      href={localizedPath(locale, `/category/${category.slug}`)}
                      key={category.slug}
                    >
                      <i className={`category-dot ${category.color}`}>
                        {category.icon}
                      </i>
                      <h3>{category.name}</h3>
                      <p>{category.description}</p>
                      <strong>{t("common.readMore")} →</strong>
                    </Link>
                  ))}
                </div>
              </section>
            );
          }
          if (section.type === "latest" || section.type === "featured") {
            return (
              <section className="section container" key={section.id}>
                <div className="section-heading">
                  <div>
                    <p className="micro-label">fikraInAction</p>
                    <h2>
                      {section.heading[locale] ||
                        (section.type === "latest"
                          ? t("home.latest")
                          : t("home.featured"))}
                    </h2>
                  </div>
                  <Link href={localizedPath(locale, "/blog")}>
                    {t("nav.blog")} <span>→</span>
                  </Link>
                </div>
                <div className="post-grid">
                  {latest.map((post) => (
                    <PostCard
                      key={post.slug}
                      href={localizedPath(locale, `/blog/${post.slug}`)}
                      title={post.title}
                      thumbnailUrl={post.thumbnailUrl}
                      thumbnailAlt={post.thumbnailAlt}
                      meta={t("common.readTime", {
                        minutes: post.readingTimeMinutes,
                      })}
                      excerpt={post.excerpt}
                      readMoreLabel={`${t("common.readMore")} →`}
                    />
                  ))}
                </div>
              </section>
            );
          }
          if (section.type === "affiliates") {
            return (
              <section className="section container" key={section.id}>
                <div className="section-heading">
                  <div>
                    <p className="micro-label">fikraInAction</p>
                    <h2>{section.heading[locale] || t("nav.tools")}</h2>
                  </div>
                  <Link href={localizedPath(locale, "/tools")}>
                    {t("nav.tools")} <span>→</span>
                  </Link>
                </div>
                <div className="tool-grid">
                  {tools.slice(0, 3).map((tool) => (
                    <article className="tool-card" key={tool.slug}>
                      <div className="tool-card-head">
                        <span className={`logo-tile ${tool.logoClass}`}>
                          {tool.logo}
                        </span>
                      </div>
                      <h3>{tool.name}</h3>
                      <p>{tool.description}</p>
                      <div className="tool-card-foot">
                        <Link href={localizedPath(locale, `/tools/${tool.slug}`)}>
                          {t("common.readMore")} →
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          }
          if (section.type === "newsletter") {
            return (
              <section className="section container newsletter-section" key={section.id}>
                <h2>{section.heading[locale] || t("common.newsletter.title")}</h2>
                <p>{t("common.newsletter.description")}</p>
                <form className="newsletter-form" action="/api/newsletter" method="post">
                  <input type="hidden" name="locale" value={locale} />
                  <label className="sr-only" htmlFor="newsletter-email">
                    {t("common.newsletter.email")}
                  </label>
                  <input
                    id="newsletter-email"
                    name="email"
                    type="email"
                    required
                    placeholder={t("common.newsletter.email")}
                  />
                  <label className="consent-row">
                    <input type="checkbox" name="consent" value="true" required />
                    {t("common.newsletter.consent")}
                  </label>
                  <input
                    className="hp-field"
                    name="honeypot"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                  />
                  <button type="submit">{t("common.newsletter.subscribe")}</button>
                </form>
              </section>
            );
          }
          return null;
        })}
    </main>
  );
}
