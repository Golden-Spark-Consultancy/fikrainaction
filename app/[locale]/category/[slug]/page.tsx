import { notFound } from "next/navigation";
import Link from "next/link";
import { categories, tools } from "../../../../lib/data";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../../lib/i18n/config";
import { createTranslator } from "../../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../../lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const category = categories.find((c) => c.slug === slug);
  return buildPageMetadata({
    locale: raw,
    title: category?.name || slug,
    description: category?.description || "",
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
  const category = categories.find((c) => c.slug === slug);
  const related = tools.filter((tool) =>
    tool.category.toLowerCase().includes((category?.name || slug).split(" ")[0].toLowerCase()),
  );

  return (
    <main id="main-content">
      <section className="category-hero">
        <div className="container">
          <p className="micro-label">fikraInAction</p>
          <h1>{category?.name || slug}</h1>
          <p>{category?.description || t("home.exploreCategories")}</p>
        </div>
      </section>
      <section className="section container">
        {related.length === 0 ? (
          <p>{t("common.noResults")}</p>
        ) : (
          <div className="tool-grid">
            {related.map((tool) => (
              <article className="tool-card" key={tool.slug}>
                <h3>{tool.name}</h3>
                <p>{tool.description}</p>
                <Link href={localizedPath(locale, `/tools/${tool.slug}`)}>
                  {t("common.readMore")} →
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
