"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { alternateLocale, localizedPath, type Locale } from "../../lib/i18n/config";

function stripLocalePrefix(pathname: string, locale: Locale) {
  return pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "") || "/";
}

function blogSlugFromPath(path: string) {
  const match = path.match(/^\/blog\/([^/]+)\/?$/);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const other = alternateLocale(locale);
  const stripped = stripLocalePrefix(pathname, locale);
  const [href, setHref] = useState(() => localizedPath(other, stripped));

  useEffect(() => {
    const path = stripLocalePrefix(pathname, locale);
    const fallback = localizedPath(other, path);
    const slug = blogSlugFromPath(path);

    if (!slug) {
      setHref(fallback);
      return;
    }

    let cancelled = false;
    setHref(fallback);

    fetch(
      `/api/locale-alternate?locale=${encodeURIComponent(locale)}&slug=${encodeURIComponent(slug)}`,
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { found?: boolean; path?: string } | null) => {
        if (cancelled) return;
        if (data?.found && data.path) {
          setHref(localizedPath(other, data.path));
          return;
        }
        // Linked translation missing/unpublished — land on the blog index in the other language.
        setHref(localizedPath(other, "/blog"));
      })
      .catch(() => {
        if (!cancelled) setHref(fallback);
      });

    return () => {
      cancelled = true;
    };
  }, [locale, other, pathname]);

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
