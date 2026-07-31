"use client";

import { usePathname } from "next/navigation";
import { isLocale, type Locale } from "../../lib/i18n/config";
import type { MenuDoc } from "../../lib/types/cms";
import { CookieConsent } from "./CookieConsent";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteChrome({
  children,
  locale: localeProp,
  headerMenu,
  footerMenu,
}: {
  children: React.ReactNode;
  locale?: Locale;
  headerMenu?: MenuDoc;
  footerMenu?: MenuDoc;
}) {
  const pathname = usePathname() || "/";
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const segment = pathname.split("/").filter(Boolean)[0];
  const locale: Locale =
    localeProp ?? (segment && isLocale(segment) ? segment : "ar");

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      {!isAdminRoute && <Header locale={locale} menu={headerMenu} />}
      {children}
      {!isAdminRoute && <Footer locale={locale} menu={footerMenu} />}
      {!isAdminRoute && <CookieConsent locale={locale} />}
    </>
  );
}
