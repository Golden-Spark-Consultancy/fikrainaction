import { notFound } from "next/navigation";
import Link from "next/link";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../lib/i18n/config";
import { createTranslator } from "../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../lib/seo/metadata";
import { createSearchProvider } from "../../../lib/cms/search";

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
    title: t("nav.search"),
    description: t("common.searchPlaceholder"),
    path: "/search",
    noIndex: true,
  });
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const { q = "" } = await searchParams;
  const t = createTranslator(locale);
  const hits = q
    ? await createSearchProvider().search(q, locale, { limit: 30 })
    : [];

  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("nav.search")}</h1>
      <form className="hero-search" action={localizedPath(locale, "/search")} style={{ marginTop: 24 }}>
        <span aria-hidden="true">⌕</span>
        <label className="sr-only" htmlFor="search-q">
          {t("nav.search")}
        </label>
        <input id="search-q" name="q" defaultValue={q} placeholder={t("common.searchPlaceholder")} />
        <button type="submit">{t("nav.search")}</button>
      </form>
      <div style={{ marginTop: 32 }}>
        {!q && <p>{t("common.searchPlaceholder")}</p>}
        {q && hits.length === 0 && <p>{t("common.noResults")}</p>}
        <div className="post-grid">
          {hits.map((hit) => (
            <article className="post-card" key={`${hit.type}-${hit.id}`}>
              <h2>
                <Link href={localizedPath(locale, `/blog/${hit.slug}`)}>
                  {hit.title}
                </Link>
              </h2>
              <p>{hit.excerpt}</p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
