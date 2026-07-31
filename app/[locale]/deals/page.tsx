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
    title: t("nav.deals"),
    description: t("common.affiliateDisclosure"),
    path: "/deals",
  });
}

export default async function DealsPage({
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
      <h1>{t("nav.deals")}</h1>
      <p className="affiliate-notice">{t("common.affiliateDisclosure")}</p>
      <p>
        {locale === "ar"
          ? "تُدار العروض وروابط الشراكة من لوحة التحكم. لا تُعرض عروض مخترعة."
          : "Offers and affiliate links are managed in the CMS. No invented promotions are shown."}
      </p>
    </main>
  );
}
