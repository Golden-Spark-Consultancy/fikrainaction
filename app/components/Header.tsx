"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { localizedPath, type Locale } from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";
import type { MenuDoc } from "../../lib/types/cms";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function Header({
  locale,
  menu,
}: {
  locale: Locale;
  menu?: MenuDoc;
}) {
  const [open, setOpen] = useState(false);
  const t = createTranslator(locale);
  const items = (menu?.items ?? []).filter((item) => item.enabled);

  useEffect(() => {
    setOpen(false);
  }, [locale]);

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link
          className="navbar-brand"
          href={localizedPath(locale)}
          aria-label={`${t("brand")} home`}
        >
          <Image
            className="nav-logo"
            src="/fikra-in-action-logo.png"
            alt="fikraInAction"
            width={1024}
            height={1024}
            priority
            unoptimized
          />
        </Link>
        <button
          className="mobile-toggle"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation"
        >
          <span />
          <span />
          <span />
        </button>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          {items.slice(0, 8).map((item) => (
            <Link
              key={item.id}
              href={
                item.external
                  ? item.href || "#"
                  : localizedPath(locale, item.href || "/")
              }
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
            >
              {item.label[locale] || item.label.en || item.label.ar || item.id}
            </Link>
          ))}
          <Link href={localizedPath(locale, "/blog")}>{t("nav.blog")}</Link>
          <Link href={localizedPath(locale, "/search")}>{t("nav.search")}</Link>
        </nav>
        <div className="nav-actions">
          <ThemeToggle />
          <LanguageSwitcher locale={locale} />
          <Link
            className="search-button"
            href={localizedPath(locale, "/search")}
            aria-label={t("nav.search")}
          >
            ⌕
          </Link>
          <Link className="nav-cta" href={localizedPath(locale, "/tools")}>
            {t("nav.tools")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
