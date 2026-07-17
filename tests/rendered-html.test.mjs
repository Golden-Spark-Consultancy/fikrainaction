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
