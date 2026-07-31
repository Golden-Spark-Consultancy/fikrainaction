import { notFound } from "next/navigation";
import { LocaleAttributes } from "../components/LocaleAttributes";
import {
  isLocale,
  localeDirection,
  LOCALES,
  type Locale,
} from "../../lib/i18n/config";
import { getMenu } from "../../lib/cms/settings";
import { SiteChrome } from "../components/SiteChrome";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const [headerMenu, footerMenu] = await Promise.all([
    getMenu("header"),
    getMenu("footer"),
  ]);

  return (
    <div data-locale={locale} dir={localeDirection(locale)} lang={locale}>
      <LocaleAttributes locale={locale} />
      <SiteChrome locale={locale} headerMenu={headerMenu} footerMenu={footerMenu}>
        {children}
      </SiteChrome>
    </div>
  );
}
