import { notFound } from "next/navigation";
import { isLocale, type Locale } from "../../../lib/i18n/config";
import { createTranslator } from "../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../lib/seo/metadata";

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
    title: t("nav.authors"),
    description: t("home.heroLead"),
    path: "/authors",
  });
}

export default async function AuthorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);
  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("nav.authors")}</h1>
      <p>{t("common.noResults")}</p>
    </main>
  );
}
