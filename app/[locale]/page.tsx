import { posts as seedPosts } from "../../lib/data";
import { listPublishedPosts } from "../../lib/cms/posts";
import {
  isLocale,
  type Locale,
} from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";
import { buildPageMetadata } from "../../lib/seo/metadata";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "../../lib/seo/jsonld";
import { notFound } from "next/navigation";
import { HomePostFeed } from "../components/HomePostFeed";

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
  const published = await listPublishedPosts(locale, { limit: 12 }).catch(() => []);
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
      : seedPosts.map((p) => ({
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt,
          readingTimeMinutes: Number(p.readTime) || 5,
          thumbnailUrl: undefined as string | undefined,
          thumbnailAlt: p.title,
        }));

  return (
    <main id="main-content" className="home-main">
      <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />

      <HomePostFeed
        locale={locale}
        posts={latest}
        readTimeLabel={(minutes) => t("common.readTime", { minutes })}
      />

      <section className="section container newsletter-section home-newsletter">
        <h2>{locale === "ar" ? "النشرة البريدية" : "Newsletter"}</h2>
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
    </main>
  );
}
