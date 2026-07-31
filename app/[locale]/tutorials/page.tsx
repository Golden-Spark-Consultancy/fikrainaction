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
    title: t("nav.tutorials"),
    description: t("home.heroLead"),
    path: "/tutorials",
  });
}

export default async function TutorialsPage({
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
      <h1>{t("nav.tutorials")}</h1>
      <p>
        {locale === "ar"
          ? "مكتبة الشروحات تُدار عبر نظام المحتوى. المقالات المنشورة تظهر في المدونة والتصنيفات."
          : "The tutorial library is managed through the CMS. Published articles appear in the blog and categories."}
      </p>
    </main>
  );
}
