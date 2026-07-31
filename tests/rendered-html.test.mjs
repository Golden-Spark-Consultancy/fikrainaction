import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps administration private to the admin route", async () => {
  const [header, adminGate] = await Promise.all([
    readFile(new URL("../app/components/Header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/AdminGate.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(header, /href=["']\/admin["']/i);
  assert.match(adminGate, /signInWithEmailAndPassword/);
  assert.match(adminGate, /type="email"/);
  assert.match(adminGate, /type="password"/);
  assert.doesNotMatch(adminGate, /GoogleAuthProvider|signInWithPopup|Continue with Google/);
});

test("uses the supplied logo with fikraInAction brand alt text", async () => {
  const [header, styles] = await Promise.all([
    readFile(new URL("../app/components/Header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(header, /alt="fikraInAction"/);
  assert.match(header, /fikra-in-action-logo\.png/);
  assert.match(styles, /\.site-header/);
  assert.match(styles, /#001329|--navy/);
});

test("locale layout wraps public chrome while admin stays separate", async () => {
  const [localeLayout, rootLayout, adminPage] = await Promise.all([
    readFile(new URL("../app/[locale]/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(localeLayout, /SiteChrome/);
  assert.doesNotMatch(rootLayout, /SiteChrome/);
  assert.match(adminPage, /AdminGate/);
  assert.match(rootLayout, /Cairo|Inter|JetBrains_Mono/);
});

test("affiliate redirect resolves products and affiliateLinks", async () => {
  const route = await readFile(new URL("../app/go/[slug]/route.ts", import.meta.url), "utf8");
  assert.match(route, /affiliateLinks|LEGACY_COLLECTIONS\.products|products/);
  assert.match(route, /affiliateClicks/);
  assert.match(route, /Response\.redirect/);
});

test("footer links to localized about and legal destinations", async () => {
  const footer = await readFile(new URL("../app/components/Footer.tsx", import.meta.url), "utf8");
  assert.match(footer, /localizedPath\(locale, "\/about"\)/);
  assert.match(footer, /fikraInAction/);
  assert.match(footer, /affiliateDisclosure|common\.footer/);
});

test("tracking is gated behind cookie consent", async () => {
  const tracking = await readFile(new URL("../app/components/Tracking.tsx", import.meta.url), "utf8");
  assert.match(tracking, /fikra-consent|readConsent|consent\.analytics/);
});

test("bilingual middleware redirects unprefixed paths", async () => {
  const middleware = await readFile(new URL("../middleware.ts", import.meta.url), "utf8");
  assert.match(middleware, /NEXT_LOCALE/);
  assert.match(middleware, /isLocale/);
  assert.match(middleware, /"admin"/);
  assert.match(middleware, /"go"/);
});
