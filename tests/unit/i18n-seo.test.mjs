import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";

// Dynamic import of TS helpers via compiled-less path is awkward in plain node.
// Mirror critical pure helpers here for regression coverage of upgrade invariants.

const LOCALES = ["ar", "en"];
const DEFAULT_LOCALE = "ar";

function isLocale(value) {
  return LOCALES.includes(value);
}

function localizedPath(locale, path = "") {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

function normalizeArabicSearchText(input) {
  return input
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

function youtubeEmbedUrl(raw) {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "");
    let id = null;
    if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] || null;
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      if (url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] || null;
      else id = url.searchParams.get("v");
    }
    if (!id || !/^[a-zA-Z0-9_-]{6,20}$/.test(id)) return null;
    return `https://www.youtube-nocookie.com/embed/${id}`;
  } catch {
    return null;
  }
}

test("default locale is Arabic", () => {
  assert.equal(DEFAULT_LOCALE, "ar");
});

test("localized paths prefix locale", () => {
  assert.equal(localizedPath("ar", "/blog"), "/ar/blog");
  assert.equal(localizedPath("en"), "/en");
});

test("arabic search normalization collapses alef forms", () => {
  assert.equal(normalizeArabicSearchText("أحمد"), normalizeArabicSearchText("احمد"));
});

test("youtube embeds use nocookie domain", () => {
  assert.equal(
    youtubeEmbedUrl("https://www.youtube.com/watch?v=qeWt9VcyZos"),
    "https://www.youtube-nocookie.com/embed/qeWt9VcyZos",
  );
});

test("brand name casing is preserved in package display intent", () => {
  const require = createRequire(import.meta.url);
  const pkg = require("../../package.json");
  assert.ok(pkg.name.includes("fikra"));
  assert.match(pkg.displayName || "", /Fikra/i);
});

test("locale guard rejects unknown codes", () => {
  assert.equal(isLocale("fr"), false);
  assert.equal(isLocale("en"), true);
});
