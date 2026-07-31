import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dirname, "..", "..");

test("articles API route supports TipTap CMS CRUD", () => {
  const source = readFileSync(join(root, "app/api/articles/route.ts"), "utf8");
  assert.match(source, /upsertPostLocale/);
  assert.match(source, /export async function PATCH/);
  assert.match(source, /export async function DELETE/);
  assert.match(source, /duplicateFrom/);
});

test("admin studio exposes only approved CMS sections", () => {
  const source = readFileSync(join(root, "app/admin/AdminStudio.tsx"), "utf8");
  assert.match(source, /PostsPanel/);
  assert.match(source, /BulkAiPanel/);
  assert.match(source, /CommentsPanel/);
  assert.match(source, /MediaLibraryPanel/);
  assert.match(source, /SiteConfigPanel/);
  assert.match(source, /DashboardPanel/);
  assert.doesNotMatch(source, /AI page generator/);
  assert.doesNotMatch(source, /Landing pages/);
  assert.doesNotMatch(source, /Affiliate links/);
  assert.doesNotMatch(source, /Legacy blog/);
});

test("bulk AI and media panels exist", () => {
  assert.equal(existsSync(join(root, "app/admin/panels/BulkAiPanel.tsx")), true);
  assert.equal(existsSync(join(root, "app/admin/panels/MediaLibraryPanel.tsx")), true);
  assert.equal(existsSync(join(root, "lib/cms/ai-blog.ts")), true);
  assert.equal(existsSync(join(root, "app/api/cms/ai-batches/route.ts")), true);
});

test("legacy admin APIs are retired with 410 responses", () => {
  for (const file of [
    "app/api/generate/route.ts",
    "app/api/pages/route.ts",
    "app/api/products/route.ts",
    "app/api/analytics/route.ts",
    "app/api/posts/route.ts",
  ]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /LEGACY_FEATURE_REMOVED|410/);
  }
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
