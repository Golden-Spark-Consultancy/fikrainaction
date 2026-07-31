"use client";

import { useEffect } from "react";
import type { Locale } from "../../lib/i18n/config";
import { localeDirection } from "../../lib/i18n/config";

export function LocaleAttributes({ locale }: { locale: Locale }) {
  useEffect(() => {
    const root = document.documentElement;
    root.lang = locale;
    root.dir = localeDirection(locale);
    root.dataset.locale = locale;
    root.style.setProperty(
      "--site-font",
      locale === "ar"
        ? "var(--font-cairo), 'Cairo', sans-serif"
        : "var(--font-inter), 'Inter', sans-serif",
    );
  }, [locale]);
  return null;
}
