"use client";

/* eslint-disable @next/next/no-img-element -- Media previews use dynamic Firebase Storage URLs. */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GeneratedPage, GenerationInput } from "../../lib/generator";
import { firebaseAuthorizedFetch } from "../../lib/firebase/api";
import { ArticlesPanel } from "./panels/ArticlesPanel";
import { CommentsPanel } from "./panels/CommentsPanel";
import { DashboardPanel } from "./panels/DashboardPanel";
import { SiteConfigPanel } from "./panels/SiteConfigPanel";
import { ToolsPanel } from "./panels/ToolsPanel";

type AdminView =
  | "overview"
  | "cms-dashboard"
  | "articles"
  | "generator"
  | "pages"
  | "products"
  | "affiliates"
  | "blog"
  | "comments"
  | "site-config"
  | "cms-tools"
  | "media"
  | "analytics";
type SavedPage = { id: string; title: string; slug: string; status: string; pageType: string; affiliateUrl?: string; updatedAt: string };
type Product = {
  id: string;
  slug: string;
  name: string;
  type: string;
  category: string;
  description: string;
  officialUrl: string;
  affiliateUrl: string;
  audience: string;
  features: string;
  pricing: string;
  status: string;
  source: string;
  updatedAt?: string | null;
};
type BlogPost = { id: string; slug: string; title: string; category: string; excerpt: string; html: string; readTime: string; status: string; updatedAt: string };
type Analytics = {
  totalClicks: number;
  last30Days: number;
  topProducts: { slug: string; count: number }[];
  recentClicks: { id: string; productSlug: string; campaign?: string | null; position?: string | null; clickedAt: string }[];
  limitedTo: number;
};
type MediaAsset = { id: string; name: string; contentType: string; size: number; url: string; uploadedAt: string };
type ApiPayload = { error?: string; setupUrl?: string; pages?: SavedPage[]; products?: Product[]; posts?: BlogPost[]; assets?: MediaAsset[]; analytics?: Analytics; [key: string]: unknown };
type PlatformNotice = { message: string; setupUrl: string };
type EditablePage = SavedPage & { html: string; seoTitle?: string; metaDescription?: string };

const initialInput: GenerationInput = { name: "", type: "AI tool", category: "AI Tools", description: "", officialUrl: "", affiliateUrl: "", audience: "", features: "", pricing: "", pageType: "Landing page", tone: "Practical and credible" };
const initialProduct = { ...initialInput, status: "active" };
const initialPost = { title: "", category: "AI Tools", contentType: "Tutorial", excerpt: "", content: "", status: "draft" };
const viewTitles: Record<AdminView, string> = {
  overview: "Overview",
  "cms-dashboard": "CMS dashboard",
  articles: "Articles (TipTap)",
  generator: "AI landing page generator",
  pages: "Landing pages",
  products: "Products",
  affiliates: "Affiliate links",
  blog: "Legacy blog HTML",
  comments: "Comments",
  "site-config": "Site config",
  "cms-tools": "Redirects & import",
  media: "Firebase media library",
  analytics: "Affiliate analytics",
};

function destinationHost(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

export function AdminStudio({ user, onSignOut }: { user: { name: string; email: string }; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<AdminView>("overview");
  const [input, setInput] = useState(initialInput);
  const [productInput, setProductInput] = useState(initialProduct);
  const [postInput, setPostInput] = useState(initialPost);
  const [generated, setGenerated] = useState<GeneratedPage | null>(null);
  const [html, setHtml] = useState("");
  const [editorTab, setEditorTab] = useState<"visual" | "html" | "seo">("visual");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [platformNotice, setPlatformNotice] = useState<PlatformNotice | null>(null);
  const [editingPage, setEditingPage] = useState<EditablePage | null>(null);

  useEffect(() => {
    Promise.all([
      firebaseAuthorizedFetch("/api/pages").then(async (response) => ({ response, data: await response.json() as ApiPayload, kind: "pages" as const })),
      firebaseAuthorizedFetch("/api/products").then(async (response) => ({ response, data: await response.json() as ApiPayload, kind: "products" as const })),
      firebaseAuthorizedFetch("/api/posts").then(async (response) => ({ response, data: await response.json() as ApiPayload, kind: "posts" as const })),
    ]).then((results) => {
      for (const { response, data, kind } of results) {
        if (!response.ok) {
          if (data.setupUrl) setPlatformNotice({ message: data.error || "Firebase setup is required.", setupUrl: data.setupUrl });
          continue;
        }
        if (kind === "pages") setPages(data.pages ?? []);
        if (kind === "products") setProducts(data.products ?? []);
        if (kind === "posts") setBlogPosts(data.posts ?? []);
      }
    }).catch(() => setMessage("Some administration data could not be loaded."));
  }, []);

  const update = (field: keyof GenerationInput, value: string) => setInput((current) => ({ ...current, [field]: value }));
  const updateProduct = (field: keyof typeof initialProduct, value: string) => setProductInput((current) => ({ ...current, [field]: value }));
  const updatePost = (field: keyof typeof initialPost, value: string) => setPostInput((current) => ({ ...current, [field]: value }));

  function apiError(data: ApiPayload, fallback: string) {
    if (data.setupUrl) setPlatformNotice({ message: data.error || fallback, setupUrl: data.setupUrl });
    return data.error || fallback;
  }

  function changeView(nextView: AdminView) {
    setView(nextView);
    setMessage("");
  }

  async function refreshProducts() {
    const response = await firebaseAuthorizedFetch("/api/products");
    const data = await response.json() as ApiPayload;
    if (!response.ok) throw new Error(apiError(data, "Unable to load products"));
    setProducts(data.products ?? []);
  }

  async function generate() {
    const enteredUrl = input.officialUrl.trim();
    if (!enteredUrl) {
      setMessage("Paste the product or platform URL first.");
      return;
    }
    const normalizedUrl = /^[a-z][a-z\d+.-]*:\/\//i.test(enteredUrl) ? enteredUrl : `https://${enteredUrl}`;
    setInput((current) => ({ ...current, officialUrl: normalizedUrl }));
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ officialUrl: normalizedUrl }) });
      const data = await response.json(); if (!response.ok) throw new Error(apiError(data, "Generation failed"));
      const imageCount = data.page.images?.length ?? 0;
      setInput(data.product); setGenerated(data.page); setHtml(data.page.html); setEditorTab("visual"); setMessage(`Complete landing page generated${imageCount ? ` with ${imageCount} relevant image${imageCount === 1 ? "" : "s"}` : ""}. Review it, then publish when ready.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate the page."); }
    finally { setLoading(false); }
  }

  async function save(status: "draft" | "published") {
    if (!generated) return; setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: generated.title, slug: generated.slug, pageType: generated.pageType, status, seo: generated.seo, html, affiliateUrl: input.affiliateUrl, affiliateDisclosure: generated.affiliateDisclosure, content: generated, product: input }) });
      const data = await response.json(); if (!response.ok) throw new Error(apiError(data, "Save failed"));
      setPlatformNotice(null);
      setMessage(status === "published" ? `Published successfully: ${data.page.publicUrl}` : "Draft and product record saved successfully.");
      const refreshed = await firebaseAuthorizedFetch("/api/pages").then((result) => result.json()); setPages(refreshed.pages ?? []);
      await refreshProducts();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the page."); }
    finally { setLoading(false); }
  }

  async function saveProduct() {
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/products", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(productInput) });
      const data = await response.json() as ApiPayload & { product?: Product };
      if (!response.ok) throw new Error(apiError(data, "Unable to save product"));
      await refreshProducts();
      setProductInput({ ...initialProduct });
      setPlatformNotice(null);
      setMessage(`${data.product?.name || "Product"} saved to the Firestore catalogue.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the product."); }
    finally { setLoading(false); }
  }

  function useProduct(product: Product) {
    setInput({ name: product.name, type: product.type || "Software", category: product.category, description: product.description, officialUrl: product.officialUrl, affiliateUrl: product.affiliateUrl, audience: product.audience || "", features: product.features || "", pricing: product.pricing || "", pageType: "Full Product Review", tone: "Practical and credible" });
    changeView("generator");
  }

  async function savePost(status: "draft" | "published") {
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/posts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...postInput, status }) });
      const data = await response.json() as ApiPayload & { post?: BlogPost };
      if (!response.ok) throw new Error(apiError(data, "Unable to save blog post"));
      const refreshed = await firebaseAuthorizedFetch("/api/posts").then((result) => result.json()); setBlogPosts(refreshed.posts ?? []);
      setPostInput({ ...initialPost });
      setPlatformNotice(null);
      setMessage(status === "published" ? `Published at /blog/${data.post?.slug}` : "Blog draft saved successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the blog post."); }
    finally { setLoading(false); }
  }

  async function openAnalytics() {
    changeView("analytics"); setLoading(true);
    try {
      const response = await firebaseAuthorizedFetch("/api/analytics");
      const data = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(apiError(data, "Unable to load analytics"));
      setAnalytics(data.analytics ?? null); setPlatformNotice(null);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load analytics."); }
    finally { setLoading(false); }
  }

  async function openMedia() {
    changeView("media");
    try {
      const response = await firebaseAuthorizedFetch("/api/media");
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Unable to load media"));
      setPlatformNotice(null); setAssets(data.assets ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load media."); }
  }

  async function uploadMedia() {
    if (!mediaFile) return;
    setUploading(true); setMessage("");
    try {
      const form = new FormData(); form.append("file", mediaFile);
      const response = await firebaseAuthorizedFetch("/api/media", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Upload failed"));
      setPlatformNotice(null); setAssets((current) => [data.asset, ...current]); setMediaFile(null); setMessage("Media uploaded to Firebase Storage successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to upload the file."); }
    finally { setUploading(false); }
  }

  async function copyLink(value: string) {
    await navigator.clipboard.writeText(value);
    setMessage("Link copied to the clipboard.");
  }

  async function refreshPages() {
    const response = await firebaseAuthorizedFetch("/api/pages");
    const data = await response.json() as ApiPayload;
    if (!response.ok) throw new Error(apiError(data, "Unable to load landing pages"));
    setPages(data.pages ?? []);
  }

  async function editPage(page: SavedPage) {
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch(`/api/pages?id=${encodeURIComponent(page.id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Unable to open the page"));
      setEditingPage(data.page); setView("pages");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to open the page."); }
    finally { setLoading(false); }
  }

  async function updateExistingPage(status: "published" | "draft" | "archived") {
    if (!editingPage) return;
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/pages", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editingPage.id, title: editingPage.title, html: editingPage.html, status, seo: { title: editingPage.seoTitle, description: editingPage.metaDescription } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Unable to update the page"));
      await refreshPages(); setEditingPage(null);
      setMessage(status === "archived" ? "Page archived and removed from the public website." : status === "published" ? "Page changes published successfully." : "Page saved as a private draft.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to update the page."); }
    finally { setLoading(false); }
  }

  async function deletePage(page: SavedPage) {
    if (!window.confirm(`Permanently delete “${page.title}”? This cannot be undone.`)) return;
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch(`/api/pages?id=${encodeURIComponent(page.id)}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Unable to delete the page"));
      await refreshPages(); setMessage("Landing page permanently deleted.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to delete the page."); }
    finally { setLoading(false); }
  }

  async function archivePage(page: SavedPage) {
    if (!window.confirm(`Archive “${page.title}”? It will immediately disappear from the public website.`)) return;
    setLoading(true); setMessage("");
    try {
      const detailResponse = await firebaseAuthorizedFetch(`/api/pages?id=${encodeURIComponent(page.id)}`);
      const detail = await detailResponse.json();
      if (!detailResponse.ok) throw new Error(apiError(detail, "Unable to open the page"));
      const response = await firebaseAuthorizedFetch("/api/pages", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: page.id, title: detail.page.title, html: detail.page.html, status: "archived", seo: { title: detail.page.seoTitle, description: detail.page.metaDescription } }) });
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Unable to archive the page"));
      await refreshPages(); setMessage("Page archived and removed from the public website.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to archive the page."); }
    finally { setLoading(false); }
  }

  const publishedCount = pages.filter((page) => page.status === "published").length;
  const activeProducts = products.filter((product) => product.status === "active").length;

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" href="/"><span className="brand-mark"><i>F</i><b>→</b></span><span>Fikra<small>admin studio</small></span></Link>
        <nav aria-label="Administration sections">
          <button className={view === "overview" ? "active" : ""} onClick={() => changeView("overview")}><span>⌂</span> Overview</button>
          <button className={view === "cms-dashboard" ? "active" : ""} onClick={() => changeView("cms-dashboard")}><span>▣</span> CMS dashboard</button>
          <button className={view === "articles" ? "active" : ""} onClick={() => changeView("articles")}><span>✎</span> Articles</button>
          <button className={view === "comments" ? "active" : ""} onClick={() => changeView("comments")}><span>💬</span> Comments</button>
          <button className={view === "site-config" ? "active" : ""} onClick={() => changeView("site-config")}><span>☰</span> Site config</button>
          <button className={view === "cms-tools" ? "active" : ""} onClick={() => changeView("cms-tools")}><span>⇄</span> Redirects / IO</button>
          <button className={view === "generator" ? "active" : ""} onClick={() => changeView("generator")}><span>✦</span> AI page generator</button>
          <button className={view === "pages" ? "active" : ""} onClick={() => changeView("pages")}><span>▤</span> Landing pages <i>{pages.length}</i></button>
          <button className={view === "products" ? "active" : ""} onClick={() => changeView("products")}><span>◫</span> Products <i>{products.length}</i></button>
          <button className={view === "affiliates" ? "active" : ""} onClick={() => changeView("affiliates")}><span>↗</span> Affiliate links</button>
          <button className={view === "blog" ? "active" : ""} onClick={() => changeView("blog")}><span>HTML</span> Legacy blog <i>{blogPosts.length}</i></button>
          <button className={view === "media" ? "active" : ""} onClick={openMedia}><span>▧</span> Media <i>{assets.length}</i></button>
          <button className={view === "analytics" ? "active" : ""} onClick={openAnalytics}><span>⌁</span> Analytics</button>
        </nav>
        <div className="admin-user"><span>{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><button onClick={onSignOut}>Sign out</button></div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar"><div><p className="micro-label">Content command centre</p><h1>{viewTitles[view]}</h1></div><button onClick={() => changeView("generator")}>+ Create landing page</button></header>
        {platformNotice && <aside className="admin-platform-notice" role="alert"><div><strong>Firebase setup required</strong><p>{platformNotice.message}</p></div><a href={platformNotice.setupUrl} target="_blank" rel="noopener noreferrer">Open Firebase setup ↗</a></aside>}

        {view === "overview" && <div className="admin-view"><section className="stat-grid"><article><span>Published pages</span><strong>{publishedCount}</strong><small>Live and indexable</small></article><article><span>Drafts</span><strong>{pages.filter((page) => page.status === "draft").length}</strong><small>Awaiting review</small></article><article><span>Tracked products</span><strong>{activeProducts}</strong><small>Active affiliate catalogue</small></article><article><span>Blog posts</span><strong>{blogPosts.filter((post) => post.status === "published").length}</strong><small>Published editorial guides</small></article></section><section className="admin-panel welcome-panel"><div><p className="micro-label">Recommended next action</p><h2>Create a bilingual TipTap article.</h2><p>Use Articles for Arabic/English editorial content with autosave, statuses, and revisions. Keep the AI generator for affiliate landing pages.</p><button onClick={() => changeView("articles")}>Open articles <span>→</span></button></div><div className="workflow-steps"><span className="done">1</span><p><strong>Write in TipTap</strong><small>Structured blocks, code, embeds</small></p><span>2</span><p><strong>Review & schedule</strong><small>Independent locale statuses</small></p><span>3</span><p><strong>Publish & track</strong><small>SEO, comments, affiliates</small></p></div></section><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Recent content</p><h2>Landing pages</h2></div><button onClick={() => changeView("pages")}>View all →</button></div><PageTable pages={pages} /></section></div>}

        {view === "cms-dashboard" && <DashboardPanel onCreateArticle={() => changeView("articles")} />}
        {view === "articles" && <ArticlesPanel />}
        {view === "comments" && <CommentsPanel />}
        {view === "site-config" && <SiteConfigPanel />}
        {view === "cms-tools" && <ToolsPanel />}

        {view === "generator" && <div className="admin-view generator-layout">
          <section className="generator-form admin-panel"><div className="panel-title"><div><p className="micro-label">One-step generator</p><h2>Paste the product URL</h2></div><span className="required-note">Nothing else required</span></div>
            <p className="admin-section-intro">That is all you need to provide. The AI will research the website and build the complete blog-style affiliate landing page automatically.</p>
            <div className="form-grid link-only-form"><label className="full-field">Product or platform URL<input autoFocus type="url" value={input.officialUrl} onChange={(event) => update("officialUrl", event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !loading) generate(); }} placeholder="Paste URL here — for example, https://www.example.com" /></label></div>
            <div className="generation-includes"><span>✓ Full article</span><span>✓ Features & pricing</span><span>✓ Pros & cons</span><span>✓ SEO</span><span>✓ Relevant images</span><span>✓ YouTube videos</span><span>✓ Affiliate CTAs</span><span>✓ FAQs</span></div>
            <button className="generate-button" onClick={generate} disabled={loading || !input.officialUrl.trim()}>{loading ? "AI is researching, finding media and building your page…" : "✦ Generate the complete landing page"}<span>→</span></button>
          </section>
          <aside className="generator-help"><div><strong>Content safeguards</strong><ul><li>Generated pages stay as drafts for review</li><li>Research starts from the official URL</li><li>Online images include source attribution</li><li>HTML is sanitized before saving</li></ul></div><div><strong>Included automatically</strong><p>A complete blog-style article, features, pricing, pros and cons, FAQs, SEO, official imagery, and up to three relevant YouTube tutorials.</p></div></aside>
          {generated && <section className="editor-panel admin-panel"><div className="editor-head"><div><p className="micro-label">Step 2 of 3</p><h2>{generated.title}</h2><span className="draft-badge">Draft · Fact-check required</span></div><div className="editor-actions"><button onClick={() => save("draft")} disabled={loading}>Save draft</button><button className="publish-button" onClick={() => save("published")} disabled={loading}>Publish page</button></div></div><div className="warning-strip">⚑ {generated.warnings.join(" ")}</div><div className="editor-tabs"><button className={editorTab === "visual" ? "active" : ""} onClick={() => setEditorTab("visual")}>Visual preview</button><button className={editorTab === "html" ? "active" : ""} onClick={() => setEditorTab("html")}>HTML editor</button><button className={editorTab === "seo" ? "active" : ""} onClick={() => setEditorTab("seo")}>SEO</button></div>{editorTab === "visual" && <div className="generated-preview" dangerouslySetInnerHTML={{ __html: html }} />}{editorTab === "html" && <textarea className="html-editor" value={html} onChange={(event) => setHtml(event.target.value)} spellCheck={false} />}{editorTab === "seo" && <div className="seo-editor"><label>SEO title<input value={generated.seo.title} onChange={(event) => setGenerated({ ...generated, seo: { ...generated.seo, title: event.target.value } })} /><small>{generated.seo.title.length}/60 recommended characters</small></label><label>Meta description<textarea rows={3} value={generated.seo.description} onChange={(event) => setGenerated({ ...generated, seo: { ...generated.seo, description: event.target.value } })} /><small>{generated.seo.description.length}/160 recommended characters</small></label><label>URL slug<input value={generated.slug} onChange={(event) => setGenerated({ ...generated, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} /></label><div className="search-preview"><small>fikrainaction.com › reviews › {generated.slug}</small><strong>{generated.seo.title}</strong><p>{generated.seo.description}</p></div></div>}{message && <div className="status-message">{message}</div>}</section>}
        </div>}

        {view === "pages" && <div className="admin-view">{editingPage ? <section className="admin-panel page-visual-editor"><div className="editor-head"><div><p className="micro-label">Visual landing-page editor</p><input className="page-title-editor" value={editingPage.title} onChange={(event) => setEditingPage({ ...editingPage, title: event.target.value })} aria-label="Page title" /><span className={`draft-badge ${editingPage.status}`}>{editingPage.status}</span></div><div className="editor-actions"><button onClick={() => setEditingPage(null)}>Cancel</button><button onClick={() => updateExistingPage("draft")} disabled={loading}>Save draft</button><button onClick={() => updateExistingPage("archived")} disabled={loading}>Archive</button><button className="publish-button" onClick={() => updateExistingPage("published")} disabled={loading}>Publish changes</button></div></div><p className="visual-editor-help">Click anywhere in the page below and edit the text directly. Formatting and links are preserved.</p><div className="generated-preview visual-edit-surface" contentEditable suppressContentEditableWarning onInput={(event) => setEditingPage({ ...editingPage, html: event.currentTarget.innerHTML })} dangerouslySetInnerHTML={{ __html: editingPage.html }} />{message && <div className="status-message">{message}</div>}</section> : <section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Content inventory</p><h2>All landing pages</h2></div><button onClick={() => changeView("generator")}>+ New page</button></div><PageTable pages={pages} onEdit={editPage} onArchive={archivePage} onDelete={deletePage} />{message && <div className="status-message">{message}</div>}</section>}</div>}

        {view === "products" && <div className="admin-view admin-management-layout"><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Firestore catalogue</p><h2>Add a product or service</h2></div><span className="required-note">* Required</span></div><div className="form-grid"><label>Name *<input value={productInput.name} onChange={(event) => updateProduct("name", event.target.value)} /></label><label>Type<select value={productInput.type} onChange={(event) => updateProduct("type", event.target.value)}><option>AI tool</option><option>SaaS</option><option>Software</option><option>Online service</option><option>Course</option><option>Digital product</option></select></label><label>Category *<input value={productInput.category} onChange={(event) => updateProduct("category", event.target.value)} /></label><label>Pricing<input value={productInput.pricing} onChange={(event) => updateProduct("pricing", event.target.value)} /></label><label className="full-field">Description *<textarea rows={3} value={productInput.description} onChange={(event) => updateProduct("description", event.target.value)} /></label><label>Official URL *<input type="url" value={productInput.officialUrl} onChange={(event) => updateProduct("officialUrl", event.target.value)} placeholder="https://" /></label><label>Affiliate URL *<input type="url" value={productInput.affiliateUrl} onChange={(event) => updateProduct("affiliateUrl", event.target.value)} placeholder="https://" /></label><label className="full-field">Target audience<input value={productInput.audience} onChange={(event) => updateProduct("audience", event.target.value)} /></label><label className="full-field">Features<textarea rows={3} value={productInput.features} onChange={(event) => updateProduct("features", event.target.value)} placeholder="One feature per line" /></label></div><button className="generate-button" onClick={saveProduct} disabled={loading}>{loading ? "Saving…" : "Save product to Firestore"}<span>→</span></button>{message && <div className="status-message">{message}</div>}</section><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">{products.length} records</p><h2>Product catalogue</h2></div></div><ProductList products={products} onUse={useProduct} /></section></div>}

        {view === "affiliates" && <div className="admin-view"><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Redirect and tracking manager</p><h2>Affiliate links</h2></div><button onClick={() => changeView("products")}>Manage products →</button></div><p className="admin-section-intro">Use the tracked Fikra URL in buttons and campaigns. Visitors are redirected to the affiliate destination while Firestore records the click.</p>{message && <div className="status-message">{message}</div>}<div className="affiliate-table"><div className="affiliate-row affiliate-row-head"><span>Product</span><span>Destination</span><span>Tracked URL</span><span /></div>{products.map((product) => { const tracked = `/go/${product.slug}`; return <div className="affiliate-row" key={product.id}><span><strong>{product.name}</strong><small>{product.status}</small></span><span>{destinationHost(product.affiliateUrl)}</span><span><code>{tracked}</code></span><span><button onClick={() => copyLink(`${globalThis.location?.origin || ""}${tracked}`)}>Copy link</button><a href={tracked} target="_blank" rel="noopener noreferrer">Test ↗</a></span></div>; })}</div>{!products.length && <div className="admin-empty"><strong>No affiliate products yet.</strong><p>Add a product to create its tracked redirect automatically.</p></div>}</section></div>}

        {view === "blog" && <div className="admin-view admin-management-layout"><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Editorial publishing</p><h2>Create a blog post</h2></div><span className="required-note">HTML supported</span></div><div className="form-grid"><label className="full-field">Title *<input value={postInput.title} onChange={(event) => updatePost("title", event.target.value)} /></label><label>Category *<input value={postInput.category} onChange={(event) => updatePost("category", event.target.value)} /></label><label>Status<select value={postInput.status} onChange={(event) => updatePost("status", event.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label><label className="full-field">Excerpt *<textarea rows={3} value={postInput.excerpt} onChange={(event) => updatePost("excerpt", event.target.value)} /></label><label className="full-field">Article HTML *<textarea className="compact-html-editor" rows={14} value={postInput.content} onChange={(event) => updatePost("content", event.target.value)} placeholder="<p>Write the introduction…</p><h2>Section heading</h2>" /></label></div><div className="editor-actions blog-actions"><button onClick={() => savePost("draft")} disabled={loading}>Save draft</button><button className="publish-button" onClick={() => savePost("published")} disabled={loading}>Publish post</button></div>{message && <div className="status-message">{message}</div>}</section><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">{blogPosts.length} Firestore posts</p><h2>Blog inventory</h2></div></div><div className="content-card-list">{blogPosts.map((post) => <article key={post.id}><div><strong>{post.title}</strong><small>{post.category} · {post.readTime}</small></div><span><i className={`status-dot ${post.status}`} />{post.status}</span>{post.status === "published" && <Link href={`/blog/${post.slug}`} target="_blank">View ↗</Link>}</article>)}</div>{!blogPosts.length && <div className="admin-empty"><strong>No Firestore blog posts yet.</strong><p>Create a draft or publish a new guide from this section.</p></div>}</section></div>}

        {view === "media" && <div className="admin-view"><section className="admin-panel media-library"><div className="panel-title"><div><p className="micro-label">Firebase Storage</p><h2>Upload page images and media</h2></div><span className="required-note">Images and videos · maximum 20 MB</span></div><label className="media-dropzone"><span>▧</span><strong>{uploading ? "Uploading to Firebase Storage…" : "Choose a media file"}</strong><small>Files are validated by the secure server route and stored under the managed media path.</small><input type="file" accept="image/*,video/*" disabled={uploading} onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} /></label><button className="media-upload-button" onClick={uploadMedia} disabled={!mediaFile || uploading}>{uploading ? "Uploading…" : "Upload selected file"}</button>{message && <div className="status-message">{message}</div>}<div className="media-grid">{assets.map((asset) => <article key={asset.id}>{asset.contentType.startsWith("image/") ? <img src={asset.url} alt={asset.name} /> : <div className="media-video-tile">VIDEO</div>}<div><strong>{asset.name}</strong><small>{Math.ceil(asset.size / 1024)} KB</small><button onClick={() => copyLink(asset.url)}>Copy URL</button></div></article>)}</div>{!assets.length && !message && <div className="admin-empty"><strong>No media uploaded yet.</strong><p>Uploaded files will appear here with a reusable Firebase Storage URL.</p></div>}</section></div>}

        {view === "analytics" && <div className="admin-view">{loading && !analytics ? <section className="admin-panel"><div className="admin-empty"><strong>Loading affiliate analytics…</strong></div></section> : <><section className="stat-grid"><article><span>Recorded clicks</span><strong>{analytics?.totalClicks ?? 0}</strong><small>Latest {analytics?.limitedTo ?? 500} records</small></article><article><span>Last 30 days</span><strong>{analytics?.last30Days ?? 0}</strong><small>Recent tracked activity</small></article><article><span>Active products</span><strong>{activeProducts}</strong><small>Available tracked destinations</small></article><article><span>Published pages</span><strong>{publishedCount}</strong><small>Live conversion opportunities</small></article></section><section className="admin-analytics-grid"><article className="admin-panel"><div className="panel-title"><div><p className="micro-label">Performance</p><h2>Top affiliate products</h2></div></div><div className="analytics-bars">{analytics?.topProducts.map((product) => <div key={product.slug}><span>{products.find((item) => item.slug === product.slug)?.name || product.slug}</span><div><i style={{ width: `${Math.max(8, product.count / Math.max(1, analytics.topProducts[0]?.count || 1) * 100)}%` }} /></div><strong>{product.count}</strong></div>)}</div>{!analytics?.topProducts.length && <div className="admin-empty"><strong>No clicks recorded yet.</strong><p>Tracked activity will appear after visitors use a `/go/` affiliate link.</p></div>}</article><article className="admin-panel"><div className="panel-title"><div><p className="micro-label">Latest activity</p><h2>Recent clicks</h2></div></div><div className="recent-clicks">{analytics?.recentClicks.map((click) => <div key={click.id}><span><strong>{products.find((item) => item.slug === click.productSlug)?.name || click.productSlug}</strong><small>{click.campaign || "Direct / untagged"}</small></span><time>{new Date(click.clickedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</time></div>)}</div></article></section>{message && <div className="status-message">{message}</div>}</>}</div>}
      </section>
    </main>
  );
}

function PageTable({ pages, onEdit, onArchive, onDelete }: { pages: SavedPage[]; onEdit?: (page: SavedPage) => void; onArchive?: (page: SavedPage) => void; onDelete?: (page: SavedPage) => void }) {
  if (!pages.length) return <div className="admin-empty"><strong>No generated pages yet.</strong><p>Your saved drafts and published pages will appear here.</p></div>;
  return <div className="page-table"><div className="page-row page-row-head"><span>Page</span><span>Type</span><span>Status</span><span>Updated</span><span>Actions</span></div>{pages.map((page) => <div className="page-row" key={page.id}><span><strong>{page.title}</strong><small>/reviews/{page.slug}</small></span><span>{page.pageType}</span><span><i className={`status-dot ${page.status}`} />{page.status}</span><span>{new Date(page.updatedAt).toLocaleDateString("en-GB")}</span><span className="page-actions">{page.status === "published" && <Link href={`/reviews/${page.slug}`} target="_blank">View</Link>}{onEdit && <button onClick={() => onEdit(page)}>Edit</button>}{onArchive && page.status !== "archived" && <button onClick={() => onArchive(page)}>Archive</button>}{onDelete && <button className="danger" onClick={() => onDelete(page)}>Delete</button>}</span></div>)}</div>;
}

function ProductList({ products, onUse }: { products: Product[]; onUse: (product: Product) => void }) {
  if (!products.length) return <div className="admin-empty"><strong>No products yet.</strong><p>Add the first affiliate product using the form.</p></div>;
  return <div className="product-card-list">{products.map((product) => <article key={product.id}><div className="product-card-mark">{product.name.slice(0, 1).toUpperCase()}</div><div><strong>{product.name}</strong><small>{product.category} · {product.pricing || "Pricing not added"}</small><p>{product.description}</p></div><span className={`catalogue-status ${product.status}`}>{product.source === "seed" ? "Seed catalogue" : product.status}</span><button onClick={() => onUse(product)}>Create page →</button></article>)}</div>;
}
