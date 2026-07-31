"use client";

import { useEffect } from "react";
import type { Locale } from "../../lib/i18n/config";
import { localeDirection } from "../../lib/i18n/config";

export function LocaleAttributes({ locale }: { locale: Locale }) {
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = localeDirection(locale);
    document.documentElement.dataset.locale = locale;
  }, [locale]);
  return null;
}
