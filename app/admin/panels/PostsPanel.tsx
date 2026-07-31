"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";
import type { ContentStatus, Locale } from "../../../lib/types/cms";
import { RichTextEditor } from "../../components/RichTextEditor";

type PostListItem = {
  id: string;
  locale: string;
  title: string;
  slug: string;
  status: string;
  excerpt?: string;
  updatedAt?: string;
  source?: string;
};

type RevisionEntry = {
  id: string;
  createdAt?: string;
  createdBy?: string;
};

type EditorState = {
  postId: string;
  locale: Locale;
  hasTranslation: boolean;
  title: string;
  slug: string;
  excerpt: string;
  content: Record<string, unknown> | null;
  status: ContentStatus;
  scheduledAt: string;
  seoTitle: string;
  seoDescription: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  noIndex: boolean;
  featured: boolean;
  pinned: boolean;
  commentsEnabled: boolean;
  isAffiliateContent: boolean;
  affiliateDisclosure: string;
  categoryIds: string;
  tagIds: string;
  relatedPostIds: string;
  thumbnailMediaId: string;
  thumbnailUrl: string;
  thumbnailAlt: string;
  caption: string;
  sources: string;
  dirty: boolean;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };
const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
};
const PAGE_SIZE = 10;

function blankEditor(locale: Locale, seed?: Partial<EditorState>): EditorState {
  return {
    postId: "",
    locale,
    hasTranslation: false,
    title: "",
    slug: "",
    excerpt: "",
    content: EMPTY_DOC,
    status: "draft",
    scheduledAt: "",
    seoTitle: "",
    seoDescription: "",
    ogTitle: "",
    ogDescription: "",
    canonicalUrl: "",
    noIndex: false,
    featured: false,
    pinned: false,
    commentsEnabled: true,
    isAffiliateContent: false,
    affiliateDisclosure: "",
    categoryIds: "",
    tagIds: "",
    relatedPostIds: "",
    thumbnailMediaId: "",
    thumbnailUrl: "",
    thumbnailAlt: "",
    caption: "",
    sources: "",
    dirty: false,
    ...seed,
  };
}

function splitCsv(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseSources(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return [];
  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
}

function rowKey(item: { id: string; locale: string }) {
  return `${item.id}::${item.locale}`;
}

function buildEditorState(
  postId: string,
  locale: Locale,
  shared: Record<string, unknown>,
  localeData: Record<string, unknown> | null,
): EditorState {
  const seo = (localeData?.seo || {}) as Record<string, unknown>;
  const affiliateDisclosureOverride = (shared.affiliateDisclosureOverride || {}) as Record<string, unknown>;
  return blankEditor(locale, {
    postId,
    hasTranslation: Boolean(localeData),
    title: String(localeData?.title || ""),
    slug: String(localeData?.slug || ""),
    excerpt: String(localeData?.excerpt || ""),
    content: (localeData?.content as Record<string, unknown>) || EMPTY_DOC,
    status: (localeData?.status as ContentStatus) || "draft",
    scheduledAt: String(localeData?.scheduledAt || "").slice(0, 16),
    seoTitle: String(seo.title || ""),
    seoDescription: String(seo.description || ""),
    ogTitle: String(seo.socialTitle || ""),
    ogDescription: String(seo.socialDescription || ""),
    canonicalUrl: String(seo.canonicalUrl || ""),
    noIndex: Boolean(seo.noIndex),
    featured: Boolean(shared.featured),
    pinned: Boolean(shared.pinned),
    commentsEnabled: shared.commentsEnabled !== false,
    isAffiliateContent: Boolean(shared.isAffiliateContent),
    affiliateDisclosure: String(affiliateDisclosureOverride[locale] || ""),
    categoryIds: ((shared.categoryIds as string[]) || []).join(", "),
    tagIds: ((shared.tagIds as string[]) || []).join(", "),
    relatedPostIds: ((shared.relatedPostIds as string[]) || []).join(", "),
    thumbnailMediaId: String(shared.thumbnailMediaId || ""),
    thumbnailUrl: String((shared as { thumbnailUrl?: string }).thumbnailUrl || ""),
    thumbnailAlt: String(localeData?.thumbnailAlt || ""),
    caption: String(localeData?.caption || ""),
    sources: Array.isArray((localeData as { sources?: unknown[] } | null)?.sources)
      ? JSON.stringify((localeData as { sources?: unknown[] }).sources, null, 2)
      : String((localeData as { sources?: string } | null)?.sources || ""),
    dirty: false,
  });
}

export function PostsPanel() {
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [localeFilter, setLocaleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [editor, setEditor] = useState<EditorState | null>(null);
  const [revisions, setRevisions] = useState<RevisionEntry[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const editorRef = useRef<EditorState | null>(null);
  editorRef.current = editor;

  const loadList = useCallback(async () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("q", search.trim());
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (localeFilter !== "all") params.set("locale", localeFilter);
    const query = params.toString();
    const res = await firebaseAuthorizedFetch(`/api/articles${query ? `?${query}` : ""}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Unable to load posts");
    setPosts(data.articles || []);
    setLoadError("");
  }, [search, statusFilter, localeFilter]);

  useEffect(() => {
    void loadList().catch((error) =>
      setLoadError(error instanceof Error ? error.message : "Unable to load posts"),
    );
  }, [loadList]);

  useEffect(() => {
    if (!editor?.dirty) return;
    const interval = setInterval(() => {
      if (editorRef.current?.dirty) void save(editorRef.current, true);
    }, 20_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.dirty, editor?.postId, editor?.locale]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (editorRef.current?.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  const filteredPosts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return posts
      .filter((item) => (statusFilter === "all" ? true : item.status === statusFilter))
      .filter((item) => (localeFilter === "all" ? true : item.locale === localeFilter))
      .filter((item) => (term ? item.title?.toLowerCase().includes(term) : true))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
  }, [posts, search, statusFilter, localeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  function toggleSelected(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelectAllVisible() {
    setSelected((current) => {
      const visibleKeys = paginatedPosts.map(rowKey);
      const allSelected = visibleKeys.every((key) => current.has(key));
      const next = new Set(current);
      if (allSelected) {
        visibleKeys.forEach((key) => next.delete(key));
      } else {
        visibleKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  }

  async function openPostById(postId: string, locale: Locale) {
    try {
      const res = await firebaseAuthorizedFetch(
        `/api/articles?id=${encodeURIComponent(postId)}&locale=${encodeURIComponent(locale)}`,
      );
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Unable to open post.");
        return;
      }
      const article = data.article;
      const shared = (article.shared || {}) as Record<string, unknown>;
      const localeData = (article.locale || null) as Record<string, unknown> | null;
      setRevisions(article.revisions || []);
      setEditor(buildEditorState(postId, locale, shared, localeData));
      setMessage("");
    } catch {
      setMessage("Unable to open post.");
    }
  }

  function openRow(item: PostListItem) {
    void openPostById(item.id, (item.locale as Locale) || "en");
  }

  function createPost(locale: Locale) {
    setRevisions([]);
    setEditor(blankEditor(locale));
    setMessage("");
  }

  async function switchLocale(nextLocale: Locale) {
    if (!editor || editor.locale === nextLocale) return;
    if (editor.dirty && !window.confirm("Discard unsaved changes and switch language?")) return;
    if (editor.postId) {
      await openPostById(editor.postId, nextLocale);
      return;
    }
    setEditor(blankEditor(nextLocale));
  }

  async function save(state: EditorState, isAutosave = false) {
    if (!state.title.trim()) {
      if (!isAutosave) setMessage("Title is required.");
      return;
    }
    setSaving(true);
    setSaveState("saving");
    try {
      const res = await firebaseAuthorizedFetch("/api/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          postId: state.postId || undefined,
          locale: state.locale,
          title: state.title,
          slug: state.slug || undefined,
          excerpt: state.excerpt,
          content: state.content,
          status: state.status,
          scheduledAt:
            state.status === "scheduled" && state.scheduledAt
              ? new Date(state.scheduledAt).toISOString()
              : null,
          seo: {
            title: state.seoTitle,
            description: state.seoDescription,
            socialTitle: state.ogTitle,
            socialDescription: state.ogDescription,
            canonicalUrl: state.canonicalUrl,
            noIndex: state.noIndex,
          },
          categoryIds: splitCsv(state.categoryIds),
          tagIds: splitCsv(state.tagIds),
          relatedPostIds: splitCsv(state.relatedPostIds),
          featured: state.featured,
          pinned: state.pinned,
          commentsEnabled: state.commentsEnabled,
          isAffiliateContent: state.isAffiliateContent,
          affiliateDisclosure: state.affiliateDisclosure,
          thumbnailMediaId: state.thumbnailMediaId || undefined,
          thumbnailUrl: state.thumbnailUrl || undefined,
          thumbnailAlt: state.thumbnailAlt,
          caption: state.caption,
          sources: parseSources(state.sources),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const saved = data.article;
      setEditor({
        ...state,
        postId: saved.shared.id,
        slug: saved.locale.slug,
        hasTranslation: true,
        dirty: false,
      });
      setSaveState("saved");
      if (!isAutosave) setMessage(`Saved (${state.status}).`);
      await loadList();
    } catch (error) {
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(status: ContentStatus) {
    if (!editor) return;
    if (status === "scheduled" && !editor.scheduledAt) {
      setMessage("Pick a schedule date/time first.");
      return;
    }
    if (!editor.postId) {
      await save({ ...editor, status });
      return;
    }
    const res = await firebaseAuthorizedFetch("/api/articles", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        postId: editor.postId,
        locale: editor.locale,
        status,
        scheduledAt:
          status === "scheduled" && editor.scheduledAt
            ? new Date(editor.scheduledAt).toISOString()
            : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Status update failed");
      return;
    }
    setEditor({ ...editor, status, dirty: false });
    setMessage(`Status set to ${status}.`);
    await loadList();
  }

  async function restoreRevision(revisionId: string) {
    if (!editor) return;
    const res = await firebaseAuthorizedFetch("/api/articles", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId: editor.postId, locale: editor.locale, revisionId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Restoring revisions isn't supported by the API yet.");
      return;
    }
    setMessage("Revision restored.");
    await openPostById(editor.postId, editor.locale);
  }

  async function duplicatePost(item: PostListItem) {
    try {
      const res = await firebaseAuthorizedFetch(
        `/api/articles?id=${encodeURIComponent(item.id)}&locale=${encodeURIComponent(item.locale)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load post");
      const shared = (data.article.shared || {}) as Record<string, unknown>;
      const localeData = (data.article.locale || {}) as Record<string, unknown>;
      const res2 = await firebaseAuthorizedFetch("/api/articles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale: item.locale,
          title: `${localeData.title || item.title} (Copy)`,
          excerpt: localeData.excerpt || "",
          content: localeData.content || EMPTY_DOC,
          status: "draft",
          seo: localeData.seo || {},
          categoryIds: shared.categoryIds || [],
          tagIds: shared.tagIds || [],
          relatedPostIds: shared.relatedPostIds || [],
          featured: false,
          isAffiliateContent: Boolean(shared.isAffiliateContent),
          commentsEnabled: shared.commentsEnabled !== false,
        }),
      });
      const saved = await res2.json();
      if (!res2.ok) throw new Error(saved.error || "Duplicate failed");
      setMessage("Post duplicated as a new draft.");
      await loadList();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Duplicate failed");
    }
  }

  async function deletePosts(items: { id: string; locale: string }[]) {
    if (!items.length) return;
    if (!window.confirm(`Delete ${items.length} post(s)? This cannot be undone.`)) return;
    let failures = 0;
    for (const item of items) {
      try {
        const res = await firebaseAuthorizedFetch(
          `/api/articles?id=${encodeURIComponent(item.id)}&locale=${encodeURIComponent(item.locale)}`,
          { method: "DELETE" },
        );
        if (!res.ok) failures += 1;
      } catch {
        failures += 1;
      }
    }
    setMessage(
      failures
        ? `${failures} of ${items.length} deletion(s) failed. Delete support may not be enabled yet.`
        : `Deleted ${items.length} post(s).`,
    );
    setSelected(new Set());
    await loadList();
  }

  async function bulkSetStatus(items: PostListItem[], status: ContentStatus) {
    if (!items.length) return;
    let failures = 0;
    for (const item of items) {
      try {
        const res = await firebaseAuthorizedFetch("/api/articles", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ postId: item.id, locale: item.locale, status }),
        });
        if (!res.ok) failures += 1;
      } catch {
        failures += 1;
      }
    }
    setMessage(
      failures
        ? `${failures} of ${items.length} update(s) failed.`
        : `Updated ${items.length} post(s) to ${status}.`,
    );
    setSelected(new Set());
    await loadList();
  }

  function selectedItems(): PostListItem[] {
    return posts.filter((item) => selected.has(rowKey(item)));
  }

  if (editor) {
    const otherLocale: Locale = editor.locale === "ar" ? "en" : "ar";
    return (
      <div className="admin-view">
        <section className="admin-panel editor-panel">
          <div className="editor-head">
            <div>
              <p className="micro-label">fikraInAction · bilingual post editor</p>
              <h2>{editor.title || "Untitled post"}</h2>
              <span className={`draft-badge ${editor.status}`}>
                {STATUS_LABELS[editor.status] || editor.status}
              </span>
              <small style={{ marginInlineStart: 12 }}>
                {saveState === "saving" && "Saving…"}
                {saveState === "saved" && "Saved"}
                {saveState === "error" && "Save error"}
                {editor.dirty && saveState !== "saving" && " · Unsaved changes"}
              </small>
            </div>
            <div className="editor-actions">
              <button
                type="button"
                onClick={() => {
                  if (editor.dirty && !window.confirm("Discard unsaved changes?")) return;
                  setEditor(null);
                }}
              >
                Back
              </button>
              <button type="button" disabled={saving} onClick={() => void save(editor)}>
                Save draft
              </button>
              <button type="button" onClick={() => void setStatus("in_review")}>
                Submit review
              </button>
              <button type="button" onClick={() => void setStatus("scheduled")}>
                Schedule
              </button>
              {editor.status === "published" ? (
                <button type="button" onClick={() => void setStatus("draft")}>
                  Unpublish
                </button>
              ) : (
                <button type="button" className="publish-button" onClick={() => void setStatus("published")}>
                  Publish
                </button>
              )}
              <button type="button" onClick={() => void setStatus("archived")}>
                Archive
              </button>
            </div>
          </div>

          <div className="editor-tabs" style={{ marginTop: 16 }}>
            <button
              type="button"
              className={editor.locale === "ar" ? "active" : ""}
              onClick={() => void switchLocale("ar")}
            >
              العربية (AR){editor.locale === "ar" && !editor.hasTranslation ? " · new" : ""}
            </button>
            <button
              type="button"
              className={editor.locale === "en" ? "active" : ""}
              onClick={() => void switchLocale("en")}
            >
              English (EN){editor.locale === "en" && !editor.hasTranslation ? " · new" : ""}
            </button>
          </div>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <label className="full-field">
              Title
              <input
                value={editor.title}
                onChange={(e) => setEditor({ ...editor, title: e.target.value, dirty: true })}
              />
            </label>
            <label>
              Slug
              <input
                value={editor.slug}
                onChange={(e) => setEditor({ ...editor, slug: e.target.value, dirty: true })}
                placeholder="auto-generated from title"
              />
            </label>
            <label>
              Status
              <select
                value={editor.status}
                onChange={(e) =>
                  setEditor({ ...editor, status: e.target.value as ContentStatus, dirty: true })
                }
              >
                <option value="draft">Draft</option>
                <option value="in_review">In review</option>
                <option value="scheduled">Scheduled</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </label>
            <label>
              Schedule for
              <input
                type="datetime-local"
                value={editor.scheduledAt}
                onChange={(e) => setEditor({ ...editor, scheduledAt: e.target.value, dirty: true })}
              />
            </label>
            <label className="full-field">
              Excerpt
              <textarea
                rows={3}
                value={editor.excerpt}
                onChange={(e) => setEditor({ ...editor, excerpt: e.target.value, dirty: true })}
              />
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            <RichTextEditor
              initialContent={editor.content}
              locale={editor.locale}
              dir={editor.locale === "ar" ? "rtl" : "ltr"}
              placeholder="Write the post…"
              onChange={(json) =>
                setEditor((current) => (current ? { ...current, content: json, dirty: true } : current))
              }
            />
          </div>

          <h3 style={{ marginTop: 28 }}>SEO &amp; sharing</h3>
          <div className="form-grid seo-editor">
            <label>
              SEO title
              <input
                value={editor.seoTitle}
                onChange={(e) => setEditor({ ...editor, seoTitle: e.target.value, dirty: true })}
              />
            </label>
            <label>
              SEO description
              <input
                value={editor.seoDescription}
                onChange={(e) => setEditor({ ...editor, seoDescription: e.target.value, dirty: true })}
              />
            </label>
            <label>
              OG title
              <input
                value={editor.ogTitle}
                onChange={(e) => setEditor({ ...editor, ogTitle: e.target.value, dirty: true })}
              />
            </label>
            <label>
              OG description
              <input
                value={editor.ogDescription}
                onChange={(e) => setEditor({ ...editor, ogDescription: e.target.value, dirty: true })}
              />
            </label>
            <label className="full-field">
              Canonical URL
              <input
                value={editor.canonicalUrl}
                onChange={(e) => setEditor({ ...editor, canonicalUrl: e.target.value, dirty: true })}
                placeholder="https://fikrainaction.com/…"
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.noIndex}
                onChange={(e) => setEditor({ ...editor, noIndex: e.target.checked, dirty: true })}
              />{" "}
              No-index this page
            </label>
          </div>

          <h3 style={{ marginTop: 28 }}>Organization</h3>
          <div className="form-grid">
            <label>
              Category IDs (comma-separated)
              <input
                value={editor.categoryIds}
                onChange={(e) => setEditor({ ...editor, categoryIds: e.target.value, dirty: true })}
              />
            </label>
            <label>
              Tag IDs (comma-separated)
              <input
                value={editor.tagIds}
                onChange={(e) => setEditor({ ...editor, tagIds: e.target.value, dirty: true })}
              />
            </label>
            <label className="full-field">
              Related post IDs (comma-separated)
              <input
                value={editor.relatedPostIds}
                onChange={(e) => setEditor({ ...editor, relatedPostIds: e.target.value, dirty: true })}
              />
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.featured}
                onChange={(e) => setEditor({ ...editor, featured: e.target.checked, dirty: true })}
              />{" "}
              Featured
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.pinned}
                onChange={(e) => setEditor({ ...editor, pinned: e.target.checked, dirty: true })}
              />{" "}
              Pinned
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.commentsEnabled}
                onChange={(e) => setEditor({ ...editor, commentsEnabled: e.target.checked, dirty: true })}
              />{" "}
              Comments enabled
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.isAffiliateContent}
                onChange={(e) =>
                  setEditor({ ...editor, isAffiliateContent: e.target.checked, dirty: true })
                }
              />{" "}
              Affiliate content
            </label>
            {editor.isAffiliateContent && (
              <label className="full-field">
                Affiliate disclosure ({editor.locale})
                <textarea
                  rows={2}
                  value={editor.affiliateDisclosure}
                  onChange={(e) =>
                    setEditor({ ...editor, affiliateDisclosure: e.target.value, dirty: true })
                  }
                />
              </label>
            )}
          </div>

          <h3 style={{ marginTop: 28 }}>Media</h3>
          <div className="form-grid">
            <label>
              Thumbnail media ID
              <input
                value={editor.thumbnailMediaId}
                onChange={(e) => setEditor({ ...editor, thumbnailMediaId: e.target.value, dirty: true })}
              />
            </label>
            <label>
              Thumbnail URL
              <input
                value={editor.thumbnailUrl}
                onChange={(e) => setEditor({ ...editor, thumbnailUrl: e.target.value, dirty: true })}
                placeholder="https://…"
              />
            </label>
            <label>
              Thumbnail alt text
              <input
                value={editor.thumbnailAlt}
                onChange={(e) => setEditor({ ...editor, thumbnailAlt: e.target.value, dirty: true })}
              />
            </label>
            <label>
              Caption
              <input
                value={editor.caption}
                onChange={(e) => setEditor({ ...editor, caption: e.target.value, dirty: true })}
              />
            </label>
            <label className="full-field">
              Sources / references (JSON array or one URL per line)
              <textarea
                rows={4}
                value={editor.sources}
                onChange={(e) => setEditor({ ...editor, sources: e.target.value, dirty: true })}
              />
            </label>
          </div>

          {editor.postId && editor.slug && (
            <p style={{ marginTop: 12 }}>
              <a href={`/${editor.locale}/blog/${editor.slug}`} target="_blank" rel="noreferrer">
                Preview public URL ↗
              </a>
              {" · "}
              <button
                type="button"
                className="btn-link"
                onClick={() => void switchLocale(otherLocale)}
              >
                Edit {otherLocale === "ar" ? "Arabic" : "English"} translation
              </button>
            </p>
          )}

          {revisions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3>Revisions</h3>
              <ul className="revisions-list">
                {revisions.map((rev) => (
                  <li key={rev.id}>
                    <span>
                      {rev.createdAt || "unknown time"} · {rev.createdBy || "unknown"}
                    </span>
                    <button type="button" onClick={() => void restoreRevision(rev.id)}>
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {message && <div className="status-message">{message}</div>}
        </section>
      </div>
    );
  }

  const selectedCount = selected.size;
  const allVisibleSelected =
    paginatedPosts.length > 0 && paginatedPosts.every((item) => selected.has(rowKey(item)));

  return (
    <div className="admin-view">
      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="micro-label">Editorial CMS</p>
            <h2>Posts</h2>
          </div>
          <button type="button" onClick={() => createPost("ar")}>
            + New Arabic
          </button>
          <button type="button" onClick={() => createPost("en")}>
            + New English
          </button>
        </div>

        <div className="posts-toolbar">
          <input
            type="search"
            placeholder="Search by title…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="in_review">In review</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={localeFilter}
            onChange={(e) => {
              setLocaleFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Both languages</option>
            <option value="ar">Arabic</option>
            <option value="en">English</option>
          </select>
        </div>

        {selectedCount > 0 && (
          <div className="bulk-toolbar">
            <span>{selectedCount} selected</span>
            <button type="button" onClick={() => void bulkSetStatus(selectedItems(), "published")}>
              Publish
            </button>
            <button type="button" onClick={() => void bulkSetStatus(selectedItems(), "draft")}>
              Unpublish
            </button>
            <button type="button" onClick={() => void bulkSetStatus(selectedItems(), "archived")}>
              Archive
            </button>
            <button
              type="button"
              className="danger"
              onClick={() =>
                void deletePosts(selectedItems().map((item) => ({ id: item.id, locale: item.locale })))
              }
            >
              Delete
            </button>
          </div>
        )}

        <div className="posts-table">
          <div className="posts-row posts-row-head">
            <span>
              <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAllVisible} />
            </span>
            <span>Title</span>
            <span>Locale</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Actions</span>
          </div>
          {paginatedPosts.map((item) => (
            <div className="posts-row" key={rowKey(item)}>
              <span>
                <input
                  type="checkbox"
                  checked={selected.has(rowKey(item))}
                  onChange={() => toggleSelected(rowKey(item))}
                />
              </span>
              <span className="posts-row-title">
                <strong>{item.title || "Untitled"}</strong>
                <small>/{item.locale}/blog/{item.slug}</small>
              </span>
              <span>{item.locale}</span>
              <span>
                <span className={`draft-badge ${item.status}`}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </span>
              <span>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "—"}</span>
              <span className="posts-row-actions">
                <button type="button" onClick={() => openRow(item)}>
                  Edit
                </button>
                <button type="button" onClick={() => void duplicatePost(item)}>
                  Duplicate
                </button>
                <a href={`/${item.locale}/blog/${item.slug}`} target="_blank" rel="noreferrer">
                  Preview
                </a>
                <button
                  type="button"
                  className="danger"
                  onClick={() => void deletePosts([{ id: item.id, locale: item.locale }])}
                >
                  Delete
                </button>
              </span>
            </div>
          ))}
        </div>

        {!paginatedPosts.length && (
          <div className="admin-empty">
            <strong>No posts match these filters.</strong>
            <p>Create an Arabic or English post with the WordPress-style editor.</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" disabled={currentPage <= 1} onClick={() => setPage((p) => p - 1)}>
              ← Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next →
            </button>
          </div>
        )}

        {loadError && <div className="status-message">{loadError}</div>}
        {message && <div className="status-message">{message}</div>}
      </section>
    </div>
  );
}
