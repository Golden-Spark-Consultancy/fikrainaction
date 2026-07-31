"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { localizedPath, type Locale } from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";

export function SearchBox({
  locale,
  initialQuery = "",
}: {
  locale: Locale;
  initialQuery?: string;
}) {
  const t = createTranslator(locale);
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  async function onChange(value: string) {
    setQ(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/search?mode=suggest&locale=${locale}&q=${encodeURIComponent(value)}`,
      );
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      setSuggestions([]);
    }
  }

  return (
    <form
      className="hero-search"
      style={{ marginTop: 24 }}
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`${localizedPath(locale, "/search")}?q=${encodeURIComponent(q)}`);
      }}
      role="search"
    >
      <span aria-hidden="true">⌕</span>
      <label className="sr-only" htmlFor="search-q">
        {t("nav.search")}
      </label>
      <input
        id="search-q"
        name="q"
        value={q}
        onChange={(e) => void onChange(e.target.value)}
        placeholder={t("common.searchPlaceholder")}
        autoComplete="off"
        list="search-suggest"
      />
      <datalist id="search-suggest">
        {suggestions.map((item) => (
          <option key={item} value={item} />
        ))}
      </datalist>
      <button type="submit">{t("nav.search")}</button>
    </form>
  );
}
