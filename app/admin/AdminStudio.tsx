"use client";

/* eslint-disable @next/next/no-img-element -- Media previews use dynamic Firebase Storage URLs. */

import Link from "next/link";
import { useEffect, useState } from "react";
import type { GeneratedPage, GenerationInput } from "../../lib/generator";
import { firebaseAuthorizedFetch } from "../../lib/firebase/api";

type SavedPage = { id: string; title: string; slug: string; status: string; pageType: string; updatedAt: string };
type MediaAsset = { id: string; name: string; contentType: string; size: number; url: string; uploadedAt: string };
type ApiPayload = { error?: string; setupUrl?: string; pages?: SavedPage[]; assets?: MediaAsset[]; [key: string]: unknown };
type PlatformNotice = { message: string; setupUrl: string };
const initialInput: GenerationInput = { name: "", type: "AI tool", category: "Artificial Intelligence", description: "", officialUrl: "", affiliateUrl: "", audience: "", features: "", pricing: "", pageType: "Full Product Review", tone: "Practical and credible" };

export function AdminStudio({ user, onSignOut }: { user: { name: string; email: string }; onSignOut: () => Promise<void> }) {
  const [view, setView] = useState<"overview" | "generator" | "pages" | "media">("overview");
  const [input, setInput] = useState(initialInput);
  const [generated, setGenerated] = useState<GeneratedPage | null>(null);
  const [html, setHtml] = useState("");
  const [editorTab, setEditorTab] = useState<"visual" | "html" | "seo">("visual");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pages, setPages] = useState<SavedPage[]>([]);
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [platformNotice, setPlatformNotice] = useState<PlatformNotice | null>(null);

  useEffect(() => {
    firebaseAuthorizedFetch("/api/pages")
      .then(async (response) => ({ response, data: await response.json() as ApiPayload }))
      .then(({ response, data }) => {
        if (!response.ok) {
          if (data.setupUrl) setPlatformNotice({ message: data.error || "Firebase setup is required.", setupUrl: data.setupUrl });
          setPages([]);
          return;
        }
        setPlatformNotice(null);
        setPages(data.pages ?? []);
      })
      .catch(() => setPages([]));
  }, []);
  const update = (field: keyof GenerationInput, value: string) => setInput((current) => ({ ...current, [field]: value }));

  function apiError(data: ApiPayload, fallback: string) {
    if (data.setupUrl) setPlatformNotice({ message: data.error || fallback, setupUrl: data.setupUrl });
    return data.error || fallback;
  }

  async function generate() {
    setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/generate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
      const data = await response.json(); if (!response.ok) throw new Error(apiError(data, "Generation failed"));
      const imageCount = data.page.images?.length ?? 0;
      setGenerated(data.page); setHtml(data.page.html); setEditorTab("visual"); setMessage(`Draft generated${imageCount ? ` with ${imageCount} online image${imageCount === 1 ? "" : "s"}` : ""}. Review every marked fact and image before publishing.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to generate the page."); }
    finally { setLoading(false); }
  }

  async function save(status: "draft" | "published") {
    if (!generated) return; setLoading(true); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/pages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title: generated.title, slug: generated.slug, pageType: generated.pageType, status, seo: generated.seo, html, affiliateUrl: input.affiliateUrl, affiliateDisclosure: generated.affiliateDisclosure, content: generated }) });
      const data = await response.json(); if (!response.ok) throw new Error(apiError(data, "Save failed"));
      setPlatformNotice(null);
      setMessage(status === "published" ? `Published successfully: ${data.page.publicUrl}` : "Draft saved successfully.");
      const refreshed = await firebaseAuthorizedFetch("/api/pages").then((result) => result.json()); setPages(refreshed.pages ?? []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save the page."); }
    finally { setLoading(false); }
  }

  async function openMedia() {
    setView("media"); setMessage("");
    try {
      const response = await firebaseAuthorizedFetch("/api/media");
      const data = await response.json();
      if (!response.ok) throw new Error(apiError(data, "Unable to load media"));
      setPlatformNotice(null);
      setAssets(data.assets ?? []);
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
      setPlatformNotice(null);
      setAssets((current) => [data.asset, ...current]); setMediaFile(null); setMessage("Media uploaded to Firebase Storage successfully.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to upload the file."); }
    finally { setUploading(false); }
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" href="/"><span className="brand-mark"><i>F</i><b>→</b></span><span>Fikra<small>admin studio</small></span></Link>
        <nav><button className={view === "overview" ? "active" : ""} onClick={() => setView("overview")}><span>⌂</span> Overview</button><button className={view === "generator" ? "active" : ""} onClick={() => setView("generator")}><span>✦</span> AI page generator</button><button className={view === "pages" ? "active" : ""} onClick={() => setView("pages")}><span>▤</span> Landing pages <i>{pages.length}</i></button><button><span>◫</span> Products</button><button><span>↗</span> Affiliate links</button><button><span>✎</span> Blog</button><button className={view === "media" ? "active" : ""} onClick={openMedia}><span>▧</span> Media <i>{assets.length}</i></button><button><span>⌁</span> Analytics</button></nav>
        <div className="admin-user"><span>{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.email}</small></div><button onClick={onSignOut}>Sign out</button></div>
      </aside>
      <section className="admin-workspace">
        <header className="admin-topbar"><div><p className="micro-label">Content command centre</p><h1>{view === "overview" ? "Overview" : view === "generator" ? "AI landing page generator" : view === "media" ? "Firebase media library" : "Landing pages"}</h1></div><button onClick={() => setView("generator")}>+ Create landing page</button></header>
        {platformNotice && <aside className="admin-platform-notice" role="alert"><div><strong>Firebase setup required</strong><p>{platformNotice.message}</p></div><a href={platformNotice.setupUrl} target="_blank" rel="noopener noreferrer">Open Firebase setup ↗</a></aside>}

        {view === "overview" && <div className="admin-view"><section className="stat-grid"><article><span>Published pages</span><strong>{pages.filter((page) => page.status === "published").length}</strong><small>Live and indexable</small></article><article><span>Drafts</span><strong>{pages.filter((page) => page.status === "draft").length}</strong><small>Awaiting review</small></article><article><span>Tracked products</span><strong>6</strong><small>Seed catalogue</small></article><article><span>Review health</span><strong>100%</strong><small>Disclosures present</small></article></section><section className="admin-panel welcome-panel"><div><p className="micro-label">Recommended next action</p><h2>Create your first real affiliate landing page.</h2><p>Enter the verified product information, generate a structured draft, edit the content or HTML, then publish it to its own review URL.</p><button onClick={() => setView("generator")}>Start generating <span>→</span></button></div><div className="workflow-steps"><span className="done">1</span><p><strong>Add product facts</strong><small>URLs, audience, pricing and features</small></p><span>2</span><p><strong>Generate & review</strong><small>Structured content, SEO and disclosure</small></p><span>3</span><p><strong>Publish & track</strong><small>Unique URL and affiliate analytics</small></p></div></section><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Recent content</p><h2>Landing pages</h2></div><button onClick={() => setView("pages")}>View all →</button></div><PageTable pages={pages} /></section></div>}

        {view === "generator" && <div className="admin-view generator-layout">
          <section className="generator-form admin-panel"><div className="panel-title"><div><p className="micro-label">Step 1 of 3</p><h2>Product information</h2></div><span className="required-note">* Required</span></div>
            <div className="form-grid"><label>Product or service name *<input value={input.name} onChange={(event) => update("name", event.target.value)} placeholder="e.g. monday.com" /></label><label>Product type *<select value={input.type} onChange={(event) => update("type", event.target.value)}><option>AI tool</option><option>SaaS</option><option>Software</option><option>Online service</option><option>Course</option><option>Digital product</option></select></label><label>Category *<input value={input.category} onChange={(event) => update("category", event.target.value)} /></label><label>Page type *<select value={input.pageType} onChange={(event) => update("pageType", event.target.value)}><option>Full Product Review</option><option>Product Overview</option><option>Product Comparison</option><option>Alternatives Page</option><option>How-to Tutorial</option><option>Deal Page</option></select></label><label className="full-field">Short description *<textarea value={input.description} onChange={(event) => update("description", event.target.value)} rows={3} placeholder="Describe what the product does using verified information." /></label><label>Official product URL *<input type="url" value={input.officialUrl} onChange={(event) => update("officialUrl", event.target.value)} placeholder="https://" /></label><label>Affiliate URL *<input type="url" value={input.affiliateUrl} onChange={(event) => update("affiliateUrl", event.target.value)} placeholder="https://" /></label><label className="full-field">Target audience *<input value={input.audience} onChange={(event) => update("audience", event.target.value)} placeholder="e.g. small marketing teams and agencies" /></label><label className="full-field">Main features<textarea value={input.features} onChange={(event) => update("features", event.target.value)} rows={4} placeholder="One feature per line. Only include verified features." /></label><label>Pricing information<input value={input.pricing} onChange={(event) => update("pricing", event.target.value)} placeholder="e.g. Free plan; paid from $12/month" /></label><label>Tone<select value={input.tone} onChange={(event) => update("tone", event.target.value)}><option>Practical and credible</option><option>Professional</option><option>Beginner-friendly</option><option>Concise</option></select></label></div>
            <button className="generate-button" onClick={generate} disabled={loading}>{loading ? "Generating structured page…" : "✦ Generate landing page"}<span>→</span></button>
          </section>
          <aside className="generator-help"><div><strong>Content safeguards</strong><ul><li>AI drafts are never published automatically</li><li>Unverified facts receive clear warnings</li><li>Official online images include source attribution</li><li>HTML is sanitized before saving</li></ul></div><div><strong>Included in the draft</strong><p>Hero, relevant online product images, benefits, features, audience fit, pricing, limitations, FAQs, SEO metadata, CTAs, and disclosure.</p></div></aside>
          {generated && <section className="editor-panel admin-panel"><div className="editor-head"><div><p className="micro-label">Step 2 of 3</p><h2>{generated.title}</h2><span className="draft-badge">Draft · Fact-check required</span></div><div className="editor-actions"><button onClick={() => save("draft")} disabled={loading}>Save draft</button><button className="publish-button" onClick={() => save("published")} disabled={loading}>Publish page</button></div></div><div className="warning-strip">⚑ {generated.warnings.join(" ")}</div><div className="editor-tabs"><button className={editorTab === "visual" ? "active" : ""} onClick={() => setEditorTab("visual")}>Visual preview</button><button className={editorTab === "html" ? "active" : ""} onClick={() => setEditorTab("html")}>HTML editor</button><button className={editorTab === "seo" ? "active" : ""} onClick={() => setEditorTab("seo")}>SEO</button></div>{editorTab === "visual" && <div className="generated-preview" dangerouslySetInnerHTML={{ __html: html }} />}{editorTab === "html" && <textarea className="html-editor" value={html} onChange={(event) => setHtml(event.target.value)} spellCheck={false} />}{editorTab === "seo" && <div className="seo-editor"><label>SEO title<input value={generated.seo.title} onChange={(event) => setGenerated({ ...generated, seo: { ...generated.seo, title: event.target.value } })} /><small>{generated.seo.title.length}/60 recommended characters</small></label><label>Meta description<textarea rows={3} value={generated.seo.description} onChange={(event) => setGenerated({ ...generated, seo: { ...generated.seo, description: event.target.value } })} /><small>{generated.seo.description.length}/160 recommended characters</small></label><label>URL slug<input value={generated.slug} onChange={(event) => setGenerated({ ...generated, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} /></label><div className="search-preview"><small>fikrainaction.com › reviews › {generated.slug}</small><strong>{generated.seo.title}</strong><p>{generated.seo.description}</p></div></div>} {message && <div className="status-message">{message}</div>}</section>}
        </div>}

        {view === "pages" && <div className="admin-view"><section className="admin-panel"><div className="panel-title"><div><p className="micro-label">Content inventory</p><h2>All landing pages</h2></div><button onClick={() => setView("generator")}>+ New page</button></div><PageTable pages={pages} /></section></div>}

        {view === "media" && <div className="admin-view"><section className="admin-panel media-library"><div className="panel-title"><div><p className="micro-label">Firebase Storage</p><h2>Upload page images and media</h2></div><span className="required-note">Images and videos · maximum 20 MB</span></div><label className="media-dropzone"><span>▧</span><strong>{uploading ? "Uploading to Firebase Storage…" : "Choose a media file"}</strong><small>Files are validated by the secure server route and stored under the managed media path.</small><input type="file" accept="image/*,video/*" disabled={uploading} onChange={(event) => setMediaFile(event.target.files?.[0] ?? null)} /></label><button className="media-upload-button" onClick={uploadMedia} disabled={!mediaFile || uploading}>{uploading ? "Uploading…" : "Upload selected file"}</button>{message && <div className="status-message">{message}</div>}<div className="media-grid">{assets.map((asset) => <article key={asset.id}>{asset.contentType.startsWith("image/") ? <img src={asset.url} alt={asset.name} /> : <div className="media-video-tile">VIDEO</div>}<div><strong>{asset.name}</strong><small>{Math.ceil(asset.size / 1024)} KB</small><button onClick={() => navigator.clipboard.writeText(asset.url)}>Copy URL</button></div></article>)}</div>{!assets.length && !message && <div className="admin-empty"><strong>No media uploaded yet.</strong><p>Uploaded files will appear here with a reusable Firebase Storage URL.</p></div>}</section></div>}
      </section>
    </main>
  );
}

function PageTable({ pages }: { pages: SavedPage[] }) {
  if (!pages.length) return <div className="admin-empty"><strong>No generated pages yet.</strong><p>Your saved drafts and published pages will appear here.</p></div>;
  return <div className="page-table"><div className="page-row page-row-head"><span>Page</span><span>Type</span><span>Status</span><span>Updated</span><span /></div>{pages.map((page) => <div className="page-row" key={page.id}><span><strong>{page.title}</strong><small>/reviews/{page.slug}</small></span><span>{page.pageType}</span><span><i className={`status-dot ${page.status}`} />{page.status}</span><span>{new Date(page.updatedAt).toLocaleDateString("en-GB")}</span><span>{page.status === "published" ? <Link href={`/reviews/${page.slug}`} target="_blank">View ↗</Link> : "Edit →"}</span></div>)}</div>;
}
