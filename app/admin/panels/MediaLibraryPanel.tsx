"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";
import type { LocalizedString } from "../../../lib/types/cms";

type MediaKind = "image" | "video" | "document" | "other";

type MediaAsset = {
  id: string;
  name: string;
  objectPath: string;
  contentType: string;
  size: number;
  url: string;
  width?: number;
  height?: number;
  alt: LocalizedString;
  caption: LocalizedString;
  credit?: string;
  uploadedBy: string;
  uploadedAt: string;
  optimizedUrl?: string;
  thumbUrl?: string;
  usageRefs?: string[];
  kind: MediaKind;
};

type EditForm = {
  name: string;
  altAr: string;
  altEn: string;
  captionAr: string;
  captionEn: string;
  credit: string;
};

const PAGE_SIZE = 24;
const TYPE_LABELS: Record<string, string> = {
  all: "All types",
  image: "Images",
  video: "Videos",
  document: "Documents",
};

function formatBytes(size: number): string {
  if (!size) return "0 KB";
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function blankEditForm(asset: MediaAsset): EditForm {
  return {
    name: asset.name,
    altAr: asset.alt.ar || "",
    altEn: asset.alt.en || "",
    captionAr: asset.caption.ar || "",
    captionEn: asset.caption.en || "",
    credit: asset.credit || "",
  };
}

export type MediaSelectPayload = {
  id: string;
  url: string;
  name: string;
  alt?: string;
  caption?: string;
};

export function MediaLibraryPanel({
  onSelect,
  variant = "page",
  imagesOnly = false,
  selectLabel = "Insert",
  autoSelectUploaded = false,
}: {
  onSelect?: (asset: MediaSelectPayload) => void;
  /** Compact WordPress-style browser for modals */
  variant?: "page" | "picker";
  imagesOnly?: boolean;
  selectLabel?: string;
  /** After upload in picker mode, immediately select the first uploaded image */
  autoSelectUploaded?: boolean;
}) {
  const isPicker = variant === "picker";
  const [assets, setAssets] = useState<MediaAsset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | MediaKind>(imagesOnly ? "image" : "all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (imagesOnly) setTypeFilter("image");
  }, [imagesOnly]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (typeFilter !== "all") params.set("type", typeFilter);
      params.set("page", String(page));
      params.set("pageSize", String(PAGE_SIZE));
      const res = await firebaseAuthorizedFetch(`/api/media?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load media.");
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load media.");
      setAssets([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  function toSelectPayload(asset: MediaAsset): MediaSelectPayload {
    return {
      id: asset.id,
      url: asset.optimizedUrl || asset.url,
      name: asset.name,
      alt: asset.alt.en || asset.alt.ar,
      caption: asset.caption.en || asset.caption.ar,
    };
  }

  async function uploadFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setMessage("");
    setError("");
    let failures = 0;
    let lastUploaded: MediaAsset | null = null;
    for (const file of list) {
      try {
        if (imagesOnly && !file.type.startsWith("image/")) {
          failures += 1;
          setError(`"${file.name}" is not an image.`);
          continue;
        }
        const form = new FormData();
        form.append("file", file);
        const res = await firebaseAuthorizedFetch("/api/media", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Unable to upload ${file.name}.`);
        if (data.asset) {
          lastUploaded = {
            ...(data.asset as MediaAsset),
            kind: classifyKind(String(data.asset.contentType || file.type)),
          };
        }
      } catch (err) {
        failures += 1;
        setError(err instanceof Error ? err.message : `Unable to upload ${file.name}.`);
      }
    }
    setUploading(false);
    if (!failures) setMessage(`Uploaded ${list.length} file(s).`);
    else setMessage(`${list.length - failures} of ${list.length} file(s) uploaded.`);
    setPage(1);
    await load();
    if (autoSelectUploaded && lastUploaded && onSelect && lastUploaded.kind === "image") {
      onSelect(toSelectPayload(lastUploaded));
    } else if (lastUploaded) {
      setSelectedId(lastUploaded.id);
    }
  }

  function classifyKind(contentType: string): MediaKind {
    if (contentType.startsWith("image/")) return "image";
    if (contentType.startsWith("video/")) return "video";
    if (contentType === "application/pdf" || contentType === "text/plain") return "document";
    return "other";
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (event.dataTransfer.files?.length) void uploadFiles(event.dataTransfer.files);
  }

  function startEdit(asset: MediaAsset) {
    setEditingId(asset.id);
    setEditForm(blankEditForm(asset));
    setMessage("");
  }

  async function saveEdit() {
    if (!editingId || !editForm) return;
    setSavingEdit(true);
    try {
      const res = await firebaseAuthorizedFetch("/api/media", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId,
          name: editForm.name,
          alt: { ar: editForm.altAr, en: editForm.altEn },
          caption: { ar: editForm.captionAr, en: editForm.captionEn },
          credit: editForm.credit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to save changes.");
      setMessage("Saved media details.");
      setEditingId(null);
      setEditForm(null);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to save changes.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteAsset(asset: MediaAsset, force = false) {
    if (!force && !window.confirm(`Delete "${asset.name}"? This cannot be undone.`)) return;
    try {
      const params = new URLSearchParams({ id: asset.id });
      if (force) params.set("force", "true");
      const res = await firebaseAuthorizedFetch(`/api/media?${params.toString()}`, { method: "DELETE" });
      const data = await res.json();
      if (res.status === 409 && !force) {
        const usedIn = Array.isArray(data.usageRefs) ? data.usageRefs.length : 0;
        if (window.confirm(`This file is used in ${usedIn} place(s). Delete anyway?`)) {
          await deleteAsset(asset, true);
        }
        return;
      }
      if (!res.ok) throw new Error(data.error || "Unable to delete media.");
      setMessage("Media file deleted.");
      if (editingId === asset.id) {
        setEditingId(null);
        setEditForm(null);
      }
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to delete media.");
    }
  }

  async function copyUrl(asset: MediaAsset) {
    const url = asset.optimizedUrl || asset.url;
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Copied URL to clipboard.");
    } catch {
      setMessage(url);
    }
  }

  const selectedAsset = assets.find((asset) => asset.id === selectedId) || null;

  return (
    <div className={isPicker ? "media-picker" : "admin-view"}>
      <section className={isPicker ? "media-picker-body" : "admin-panel"}>
        {!isPicker ? (
          <div className="panel-title">
            <div>
              <p className="micro-label">Media Library</p>
              <h2>Media</h2>
            </div>
          </div>
        ) : null}

        <div
          className={`media-dropzone${isPicker ? " media-dropzone-compact" : ""}${dragOver ? " is-active" : ""}`}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={0}
        >
          <span>{uploading ? "…" : "⇪"}</span>
          <strong>{uploading ? "Uploading…" : "Drop files here or click to upload"}</strong>
          <small>
            {imagesOnly
              ? "Images only · up to 20 MB each"
              : "Images, videos, PDF, or plain text · up to 20 MB each"}
          </small>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={imagesOnly ? "image/*" : "image/*,video/*,application/pdf,text/plain"}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => {
              if (event.target.files?.length) void uploadFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <div className="posts-toolbar">
          <input
            type="search"
            placeholder="Search media by name, alt text, or caption…"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
          {!imagesOnly ? (
            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(event.target.value as "all" | MediaKind);
                setPage(1);
              }}
            >
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          ) : null}
        </div>

        {loading && (
          <div className="admin-empty">
            <strong>Loading media…</strong>
          </div>
        )}

        {!loading && error && <div className="status-message">{error}</div>}

        {!loading && !error && !assets.length && (
          <div className="admin-empty">
            <strong>No media files match these filters.</strong>
            <p>Upload {imagesOnly ? "an image" : "a file"} to get started.</p>
          </div>
        )}

        {!loading && assets.length > 0 && (
          <div className={`media-grid${isPicker ? " media-grid-picker" : ""}`}>
            {assets.map((asset) => {
              const selectable = Boolean(onSelect) && (!imagesOnly || asset.kind === "image");
              return (
                <article
                  key={asset.id}
                  className={`${selectedId === asset.id ? "is-selected" : ""}${selectable ? " is-selectable" : ""}`}
                  onClick={() => {
                    if (!selectable) return;
                    setSelectedId(asset.id);
                  }}
                  onDoubleClick={() => {
                    if (!selectable || !onSelect) return;
                    onSelect(toSelectPayload(asset));
                  }}
                >
                  {asset.kind === "image" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.thumbUrl || asset.optimizedUrl || asset.url}
                      alt={asset.alt.en || asset.alt.ar || asset.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="media-video-tile">{asset.kind.toUpperCase()}</div>
                  )}
                  <div>
                    <strong title={asset.name}>{asset.name}</strong>
                    <small>
                      {formatBytes(asset.size)} · {asset.kind}
                      {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ""}
                    </small>
                    {!isPicker ? (
                      <div className="page-actions" style={{ gridColumn: "1 / -1" }}>
                        {onSelect && selectable ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onSelect(toSelectPayload(asset));
                            }}
                          >
                            {selectLabel}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            startEdit(asset);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            void copyUrl(asset);
                          }}
                        >
                          Copy URL
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteAsset(asset);
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pagination">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
              ← Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>
              Next →
            </button>
          </div>
        )}

        {message && <div className="status-message">{message}</div>}

        {isPicker && onSelect ? (
          <div className="media-picker-footer">
            <small>
              {selectedAsset
                ? `Selected: ${selectedAsset.name}`
                : "Select an image, or double-click to use it immediately."}
            </small>
            <button
              type="button"
              className="btn-primary"
              disabled={!selectedAsset || (imagesOnly && selectedAsset.kind !== "image")}
              onClick={() => {
                if (!selectedAsset) return;
                onSelect(toSelectPayload(selectedAsset));
              }}
            >
              {selectLabel}
            </button>
          </div>
        ) : null}
      </section>

      {!isPicker && editingId && editForm && (
        <section className="admin-panel">
          <div className="panel-title">
            <div>
              <p className="micro-label">Media details</p>
              <h2>Edit metadata</h2>
            </div>
          </div>
          <div className="form-grid">
            <label className="full-field">
              File name
              <input value={editForm.name} onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} />
            </label>
            <label>
              Alt text (Arabic)
              <input value={editForm.altAr} onChange={(event) => setEditForm({ ...editForm, altAr: event.target.value })} dir="rtl" />
            </label>
            <label>
              Alt text (English)
              <input value={editForm.altEn} onChange={(event) => setEditForm({ ...editForm, altEn: event.target.value })} />
            </label>
            <label>
              Caption (Arabic)
              <input value={editForm.captionAr} onChange={(event) => setEditForm({ ...editForm, captionAr: event.target.value })} dir="rtl" />
            </label>
            <label>
              Caption (English)
              <input value={editForm.captionEn} onChange={(event) => setEditForm({ ...editForm, captionEn: event.target.value })} />
            </label>
            <label className="full-field">
              Credit / attribution
              <input value={editForm.credit} onChange={(event) => setEditForm({ ...editForm, credit: event.target.value })} />
            </label>
          </div>
          <div className="editor-actions" style={{ marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setEditForm(null);
              }}
            >
              Cancel
            </button>
            <button type="button" className="publish-button" disabled={savingEdit} onClick={() => void saveEdit()}>
              {savingEdit ? "Saving…" : "Save changes"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
