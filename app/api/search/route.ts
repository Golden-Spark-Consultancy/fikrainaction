import { NextResponse } from "next/server";
import { createSearchProvider } from "../../../lib/cms/search";
import { isLocale, type Locale } from "../../../lib/i18n/config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q") || "";
  const localeParam = url.searchParams.get("locale") || "ar";
  const locale: Locale = isLocale(localeParam) ? localeParam : "ar";
  const mode = url.searchParams.get("mode") || "search";
  const provider = createSearchProvider();

  if (mode === "suggest") {
    const suggestions = await provider.suggest(q, locale, { limit: 8 });
    return NextResponse.json({ suggestions });
  }

  const hits = await provider.search(q, locale, { limit: 30 });
  return NextResponse.json({ hits });
}
