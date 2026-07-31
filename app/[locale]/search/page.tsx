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
import { PostCard } from "../../components/PostCard";
import { SearchBox } from "../../components/SearchBox";

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
  const provider = createSearchProvider();
  const [hits, suggestions] = q
    ? await Promise.all([
        provider.search(q, locale, { limit: 30 }),
        provider.suggest(q, locale, { limit: 6 }),
      ])
    : [[], []];

  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("nav.search")}</h1>
      <SearchBox locale={locale} initialQuery={q} />
      {q && suggestions.length > 0 && (
        <p className="search-suggestions">
          {suggestions.map((item) => (
            <Link
              key={item}
              href={`${localizedPath(locale, "/search")}?q=${encodeURIComponent(item)}`}
            >
              {item}
            </Link>
          ))}
        </p>
      )}
      <div style={{ marginTop: 32 }}>
        {!q && <p>{t("common.searchPlaceholder")}</p>}
        {q && hits.length === 0 && <p>{t("common.noResults")}</p>}
        <div className="post-grid">
          {hits.map((hit) => {
            const href =
              hit.type === "category"
                ? localizedPath(locale, `/category/${hit.slug}`)
                : hit.type === "tool"
                  ? localizedPath(locale, `/tools/${hit.slug}`)
                  : localizedPath(locale, `/blog/${hit.slug}`);
            return (
              <PostCard
                key={`${hit.type}-${hit.id}`}
                href={href}
                title={hit.title}
                thumbnailUrl={hit.type === "post" ? hit.thumbnailUrl : undefined}
                thumbnailAlt={hit.title}
                meta={hit.type}
                excerpt={hit.excerpt}
                readMoreLabel={`${t("common.readMore")} →`}
              />
            );
          })}
        </div>
      </div>
    </main>
  );
}
