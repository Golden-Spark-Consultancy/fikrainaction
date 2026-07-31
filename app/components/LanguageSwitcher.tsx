"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { alternateLocale, localizedPath, type Locale } from "../../lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const other = alternateLocale(locale);
  const stripped = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
  const href = localizedPath(other, stripped);

  return (
    <Link
      className="language-switcher"
      href={href}
      hrefLang={other}
      lang={other}
      aria-label={other === "ar" ? "العربية" : "English"}
    >
      {other === "ar" ? "العربية" : "EN"}
    </Link>
  );
}
