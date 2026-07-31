"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { localizedPath, type Locale } from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";
import { normalizeHeaderMenu } from "../../lib/nav/menu";
import type { MenuDoc, MenuItem } from "../../lib/types/cms";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { iconForNavItem, NavIcon } from "./NavIcon";
import { ThemeToggle } from "./ThemeToggle";

function itemLabel(item: MenuItem, locale: Locale) {
  return item.label[locale] || item.label.en || item.label.ar || item.id;
}

function itemHref(item: MenuItem, locale: Locale) {
  if (!item.href) return "#";
  return item.external ? item.href : localizedPath(locale, item.href);
}

export function Header({
  locale,
  menu,
}: {
  locale: Locale;
  menu?: MenuDoc;
}) {
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const t = createTranslator(locale);
  const items = normalizeHeaderMenu(menu);

  useEffect(() => {
    setOpen(false);
    setOpenGroup(null);
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
        <nav
          className={open ? "nav-links open" : "nav-links"}
          aria-label="Main navigation"
        >
          {items.map((item) => {
            const children = (item.children ?? []).filter((child) => child.enabled !== false);
            const icon = iconForNavItem(item.id, item.icon);

            if (children.length > 0) {
              const expanded = openGroup === item.id;
              return (
                <div
                  key={item.id}
                  className={`nav-dropdown${expanded ? " open" : ""}`}
                  onMouseEnter={() => setOpenGroup(item.id)}
                  onMouseLeave={() => setOpenGroup((current) => (current === item.id ? null : current))}
                >
                  <button
                    type="button"
                    className="nav-dropdown-trigger"
                    aria-expanded={expanded}
                    aria-haspopup="true"
                    onClick={() =>
                      setOpenGroup((current) => (current === item.id ? null : item.id))
                    }
                  >
                    <NavIcon name={icon} />
                    <span>{itemLabel(item, locale)}</span>
                    <span className="nav-caret" aria-hidden="true">
                      ▾
                    </span>
                  </button>
                  <div className="nav-dropdown-panel" role="menu">
                    {item.href ? (
                      <Link
                        role="menuitem"
                        className="nav-dropdown-parent"
                        href={itemHref(item, locale)}
                        onClick={() => setOpen(false)}
                      >
                        <NavIcon name={icon} />
                        <span>{itemLabel(item, locale)}</span>
                      </Link>
                    ) : null}
                    {children.map((child) => (
                      <Link
                        key={child.id}
                        role="menuitem"
                        href={itemHref(child, locale)}
                        target={child.external ? "_blank" : undefined}
                        rel={child.external ? "noopener noreferrer" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <NavIcon name={iconForNavItem(child.id, child.icon)} />
                        <span>{itemLabel(child, locale)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.id}
                className="nav-link-item"
                href={itemHref(item, locale)}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                onClick={() => setOpen(false)}
              >
                <NavIcon name={icon} />
                <span>{itemLabel(item, locale)}</span>
              </Link>
            );
          })}
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
