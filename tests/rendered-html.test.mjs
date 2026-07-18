import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

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

test("uses the supplied logo in a dark, accessible navigation bar", async () => {
  const [header, styles] = await Promise.all([
    readFile(new URL("../app/components/Header.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(header, /src="\/fikra-in-action-logo\.png"/);
  assert.match(header, /alt="Fikra in Action"/);
  assert.match(styles, /\.site-header\s*\{[^}]*background:\s*rgba\(5,10,18,.97\)/);
  assert.match(styles, /\.nav-links\s*\{[^}]*color:\s*#c9d5e3/);
  assert.match(styles, /\.nav-links a:hover[^}]*color:\s*#ffffff/);
  assert.match(styles, /\.mobile-toggle span[^}]*background:\s*#e7eef6/);
});

test("applies shared header and footer to every public route while keeping admin separate", async () => {
  const [layout, chrome, adminPage] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/SiteChrome.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/admin/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /<SiteChrome>\{children\}<\/SiteChrome>/);
  assert.match(chrome, /!isAdminRoute\s*&&\s*<Header\s*\/>/);
  assert.match(chrome, /!isAdminRoute\s*&&\s*<Footer\s*\/>/);
  assert.match(chrome, /pathname\.startsWith\("\/admin\/"\)/);
  assert.doesNotMatch(adminPage, /<Header\s*\/>/);
});

test("uses a light silver-blue theme with matching dark footer", async () => {
  const [footer, styles] = await Promise.all([
    readFile(new URL("../app/components/Footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(footer, /src="\/fikra-in-action-logo\.png"/);
  assert.match(styles, /--cream:\s*#f3f7fb/);
  assert.match(styles, /--blue:\s*#168cff/);
  assert.match(styles, /\.hero-shell[^}]*#f1f6fb/);
  assert.match(styles, /\.site-footer[^}]*background:\s*var\(--navy\)/);
  assert.match(styles, /\.footer-grid > div > strong[^}]*color:\s*#65b5ff/);
});

test("includes online image discovery and actionable Firebase setup handling", async () => {
  const [generator, discovery, serviceErrors] = await Promise.all([
    readFile(new URL("../lib/generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/image-discovery.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/firebase/service-errors.ts", import.meta.url), "utf8"),
  ]);

  assert.match(discovery, /api\.microlink\.io/);
  assert.match(discovery, /screenshot/);
  assert.match(generator, /generated-media/);
  assert.match(generator, /Image source:/);
  assert.match(serviceErrors, /FIRESTORE_SETUP_REQUIRED/);
  assert.match(serviceErrors, /console\.firebase\.google\.com/);
});

test("creates complete AI landing pages from one platform link", async () => {
  const [studio, route, ai, research, generator, youtube, sanitizer] = await Promise.all([
    readFile(new URL("../app/admin/AdminStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/generate/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/ai-generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/platform-research.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/generator.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/youtube.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/sanitize.ts", import.meta.url), "utf8"),
  ]);

  assert.match(studio, /initialInput:\s*GenerationInput\s*=\s*\{\s*platformUrl:\s*["']["']\s*\}/);
  assert.match(studio, /One link only/);
  assert.match(studio, /No description, features, audience, packages, pricing, or media links are required/);
  assert.doesNotMatch(studio, /value=\{input\.(?:name|description|features|pricing|audience|affiliateUrl)\}/);
  assert.match(route, /researchPlatform\(platformUrl\)/);
  assert.match(route, /generateAiLandingDraft\(research\)/);
  assert.match(route, /generateAndStoreAiImages/);
  assert.match(research, /validatePublicPlatformUrl/);
  assert.match(research, /pricing/);
  assert.match(ai, /gemini-2\.5-flash/);
  assert.match(ai, /gemini-2\.5-flash-image/);
  assert.match(ai, /generated-media/);
  assert.match(ai, /Vertex AI User/);
  assert.match(youtube, /youtube\/v3\/search/);
  assert.match(youtube, /videoEmbeddable/);
  assert.match(youtube, /youtube-nocookie\.com/);
  assert.match(generator, /video\.embedUrl/);
  assert.match(generator, /Plans and pricing/);
  assert.match(generator, /Official sources reviewed/);
  assert.match(generator, /AI-generated editorial illustration/);
  assert.match(sanitizer, /youtube-nocookie/);
});

test("provides working admin sections for products, affiliate links, blog and analytics", async () => {
  const [studio, productsApi, postsApi, analyticsApi, affiliateRedirect] = await Promise.all([
    readFile(new URL("../app/admin/AdminStudio.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/products/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/posts/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analytics/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/go/[slug]/route.ts", import.meta.url), "utf8"),
  ]);

  assert.match(studio, /changeView\("products"\)/);
  assert.match(studio, /changeView\("affiliates"\)/);
  assert.match(studio, /changeView\("blog"\)/);
  assert.match(studio, /openAnalytics/);
  assert.match(productsApi, /collection\("products"\)/);
  assert.match(postsApi, /collection\("blogPosts"\)/);
  assert.match(analyticsApi, /collection\("affiliateClicks"\)/);
  assert.match(affiliateRedirect, /collection\("products"\)/);
});

test("publishes complete trust, company and legal pages", async () => {
  const [content, page, footer, sitemap, robots] = await Promise.all([
    readFile(new URL("../lib/content-pages.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/[slug]/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/components/Footer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/sitemap.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
  ]);

  for (const route of [
    "about",
    "editorial-policy",
    "review-methodology",
    "contact",
    "affiliate-disclosure",
    "privacy",
    "terms",
    "cookies",
  ]) {
    assert.match(content, new RegExp(`(?:[\"']${route}[\"']|\\b${route})\\s*:`));
    assert.match(footer, new RegExp(`href=[\"']/${route}[\"']`));
    assert.match(sitemap, new RegExp(`[\"']/${route}[\"']`));
  }

  assert.match(content, /Golden Spark Consultancy/);
  assert.match(content, /Personal Data Protection Law/i);
  assert.match(content, /Firebase Authentication/);
  assert.match(content, /clear.*disclosure near/si);
  assert.match(content, /laws of the Kingdom of Bahrain/i);
  assert.match(content, /terms-of-service/);
  assert.match(page, /policy-toc/);
  assert.match(page, /generateMetadata/);
  assert.match(robots, /disallow: \["\/admin", "\/api\/"\]/);
});
