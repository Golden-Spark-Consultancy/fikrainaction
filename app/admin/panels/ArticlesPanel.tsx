"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";
import type { ContentStatus, Locale } from "../../../lib/types/cms";
import { RichTextEditor } from "../../components/RichTextEditor";

type ArticleListItem = {
  id: string;
  locale: string;
  title: string;
  slug: string;
  status: string;
  excerpt?: string;
  updatedAt?: string;
  source?: string;
};

type EditorState = {
  postId: string;
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string;
  content: Record<string, unknown> | null;
  status: ContentStatus;
  scheduledAt: string;
  seoTitle: string;
  seoDescription: string;
  featured: boolean;
  isAffiliateContent: boolean;
  commentsEnabled: boolean;
  dirty: boolean;
};

const emptyDoc = { type: "doc", content: [{ type: "paragraph" }] };

function newEditor(locale: Locale = "en"): EditorState {
  return {
    postId: "",
    locale,
    title: "",
    slug: "",
    excerpt: "",
    content: emptyDoc,
    status: "draft",
    scheduledAt: "",
    seoTitle: "",
    seoDescription: "",
    featured: false,
    isAffiliateContent: false,
    commentsEnabled: true,
    dirty: false,
  };
}

export function ArticlesPanel() {
  const [articles, setArticles] = useState<ArticleListItem[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [revisions, setRevisions] = useState<{ id: string; createdAt?: string; createdBy?: string }[]>([]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autosaveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadList = useCallback(async () => {
    const res = await firebaseAuthorizedFetch("/api/articles");
    const data = await res.json();
    if (res.ok) setArticles(data.articles || []);
  }, []);

  useEffect(() => {
    void loadList().catch(() => setMessage("Unable to load articles."));
  }, [loadList]);

  useEffect(() => {
    if (!editor?.dirty) return;
    autosaveRef.current = setInterval(() => {
      void save(editor, true);
    }, 20_000);
    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor?.dirty, editor?.postId, editor?.locale, editor?.title, editor?.content]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (editor?.dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editor?.dirty]);

  async function openArticle(item: ArticleListItem) {
    const res = await firebaseAuthorizedFetch(
      `/api/articles?id=${encodeURIComponent(item.id)}&locale=${encodeURIComponent(item.locale || "en")}`,
    );
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to open article");
      return;
    }
    const locale = (data.article.locale || {}) as Record<string, unknown>;
    const shared = (data.article.shared || {}) as Record<string, unknown>;
    setRevisions(data.article.revisions || []);
    setEditor({
      postId: item.id,
      locale: (locale.locale as Locale) || (item.locale as Locale) || "en",
      title: String(locale.title || item.title || ""),
      slug: String(locale.slug || item.slug || ""),
      excerpt: String(locale.excerpt || ""),
      content: (locale.content as Record<string, unknown>) || emptyDoc,
      status: (locale.status as ContentStatus) || "draft",
      scheduledAt: String(locale.scheduledAt || "").slice(0, 16),
      seoTitle: String((locale.seo as { title?: string } | undefined)?.title || ""),
      seoDescription: String((locale.seo as { description?: string } | undefined)?.description || ""),
      featured: Boolean(shared.featured),
      isAffiliateContent: Boolean(shared.isAffiliateContent),
      commentsEnabled: shared.commentsEnabled !== false,
      dirty: false,
    });
    setMessage("");
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
          scheduledAt: state.status === "scheduled" && state.scheduledAt
            ? new Date(state.scheduledAt).toISOString()
            : null,
          seo: { title: state.seoTitle, description: state.seoDescription },
          featured: state.featured,
          isAffiliateContent: state.isAffiliateContent,
          commentsEnabled: state.commentsEnabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      const saved = data.article;
      setEditor({
        ...state,
        postId: saved.shared.id,
        slug: saved.locale.slug,
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
    if (!editor?.postId) {
      await save({ ...editor!, status });
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

  if (editor) {
    return (
      <div className="admin-view">
        <section className="admin-panel">
          <div className="editor-head">
            <div>
              <p className="micro-label">fikraInAction · bilingual article editor</p>
              <h2>{editor.title || "Untitled article"}</h2>
              <span className={`draft-badge ${editor.status}`}>{editor.status}</span>
              <small style={{ marginInlineStart: 12 }}>
                {saveState === "saving" && "Saving…"}
                {saveState === "saved" && "Saved"}
                {saveState === "error" && "Save error"}
                {editor.dirty && saveState === "idle" && "Unsaved changes"}
              </small>
            </div>
            <div className="editor-actions">
              <button type="button" onClick={() => setEditor(null)}>Back</button>
              <button type="button" disabled={saving} onClick={() => void save(editor)}>Save</button>
              <button type="button" onClick={() => void setStatus("in_review")}>Submit review</button>
              <button type="button" onClick={() => void setStatus("scheduled")}>Schedule</button>
              <button type="button" className="publish-button" onClick={() => void setStatus("published")}>
                Publish
              </button>
            </div>
          </div>

          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              Locale
              <select
                value={editor.locale}
                onChange={(e) =>
                  setEditor({ ...editor, locale: e.target.value as Locale, dirty: true })
                }
              >
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
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
              />
            </label>
            <label>
              Schedule
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
                onChange={(e) =>
                  setEditor({ ...editor, seoDescription: e.target.value, dirty: true })
                }
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
                checked={editor.isAffiliateContent}
                onChange={(e) =>
                  setEditor({ ...editor, isAffiliateContent: e.target.checked, dirty: true })
                }
              />{" "}
              Affiliate content
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={editor.commentsEnabled}
                onChange={(e) =>
                  setEditor({ ...editor, commentsEnabled: e.target.checked, dirty: true })
                }
              />{" "}
              Comments enabled
            </label>
          </div>

          <div style={{ marginTop: 18 }}>
            <RichTextEditor
              initialContent={editor.content}
              onChange={(json) => setEditor((current) => current ? { ...current, content: json, dirty: true } : current)}
              placeholder="Write the article…"
            />
          </div>

          {editor.postId && (
            <p style={{ marginTop: 12 }}>
              <Link href={`/${editor.locale}/blog/${editor.slug}`} target="_blank">
                Preview public URL ↗
              </Link>
            </p>
          )}

          {revisions.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3>Revisions</h3>
              <ul>
                {revisions.map((rev) => (
                  <li key={rev.id}>
                    {rev.createdAt || "unknown"} · {rev.createdBy || "unknown"}
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

  return (
    <div className="admin-view">
      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="micro-label">Editorial CMS</p>
            <h2>Articles</h2>
          </div>
          <button type="button" onClick={() => setEditor(newEditor("ar"))}>
            + New Arabic
          </button>
          <button type="button" onClick={() => setEditor(newEditor("en"))}>
            + New English
          </button>
        </div>
        <div className="content-card-list">
          {articles.map((article) => (
            <article key={`${article.id}-${article.locale}-${article.source}`}>
              <div>
                <strong>{article.title}</strong>
                <small>
                  {article.locale} · {article.status} · {article.source}
                </small>
              </div>
              <button type="button" onClick={() => void openArticle(article)}>
                Edit
              </button>
            </article>
          ))}
        </div>
        {!articles.length && (
          <div className="admin-empty">
            <strong>No articles yet.</strong>
            <p>Create an Arabic or English article with the TipTap editor.</p>
          </div>
        )}
        {message && <div className="status-message">{message}</div>}
      </section>
    </div>
  );
}
