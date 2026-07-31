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
  return buildPageMetadata({
    locale: raw,
    title: "Review methodology",
    description: "How fikraInAction evaluates tools and products.",
    path: "/review-methodology",
  });
}

export default async function ReviewMethodologyPage({
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
      <h1>{locale === "ar" ? "منهجية المراجعة" : "Review methodology"}</h1>
      <p>
        {locale === "ar"
          ? "نختبر الأدوات وفق سيناريوهات عملية ونفصل بين التقييم التحريري والعلاقات الشريكة."
          : "We evaluate tools against practical scenarios and keep editorial judgment separate from affiliate relationships."}
      </p>
      <p>{t("common.affiliateDisclosure")}</p>
    </main>
  );
}
