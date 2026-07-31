import { notFound } from "next/navigation";
import { isLocale, type Locale } from "../../../../lib/i18n/config";
import { createTranslator } from "../../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../../lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  return buildPageMetadata({
    locale: raw,
    title: slug,
    description: slug,
    path: `/authors/${slug}`,
  });
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);
  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{slug}</h1>
      <p>{t("common.byAuthor")}</p>
    </main>
  );
}
