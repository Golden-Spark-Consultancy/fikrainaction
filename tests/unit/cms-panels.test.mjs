import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");

test("articles API route exists for TipTap CMS", () => {
  const source = readFileSync(join(root, "app/api/articles/route.ts"), "utf8");
  assert.match(source, /upsertPostLocale/);
  assert.match(source, /export async function PATCH/);
});

test("admin studio exposes new CMS panels", () => {
  const source = readFileSync(join(root, "app/admin/AdminStudio.tsx"), "utf8");
  assert.match(source, /ArticlesPanel/);
  assert.match(source, /CommentsPanel/);
  assert.match(source, /SiteConfigPanel/);
  assert.match(source, /DashboardPanel/);
});

test("search provider supports suggestions", () => {
  const source = readFileSync(join(root, "lib/cms/search.ts"), "utf8");
  assert.match(source, /suggest\(/);
  assert.match(source, /scoreMatch/);
});

test("theme toggle and cookie consent components exist", () => {
  assert.match(
    readFileSync(join(root, "app/components/ThemeToggle.tsx"), "utf8"),
    /fikra_theme/,
  );
  assert.match(
    readFileSync(join(root, "app/components/CookieConsent.tsx"), "utf8"),
    /fikra_consent/,
  );
});
