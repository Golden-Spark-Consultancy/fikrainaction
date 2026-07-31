"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";
import type { CategoryDoc } from "../../../lib/types/cms";
import { NavIcon } from "../../components/NavIcon";

type Draft = {
  id: string;
  parentId: string;
  order: number;
  showInNav: boolean;
  enabled: boolean;
  icon: string;
  nameAr: string;
  nameEn: string;
  slugAr: string;
  slugEn: string;
  descriptionAr: string;
  descriptionEn: string;
};

const ICON_OPTIONS = [
  "ai",
  "automation",
  "software",
  "programming",
  "hardware",
  "arduino",
  "raspberry-pi",
  "esp32",
  "tutorials",
  "reviews",
  "guides",
  "blog",
  "folder",
];

const emptyDraft = (): Draft => ({
  id: "",
  parentId: "",
  order: 0,
  showInNav: true,
  enabled: true,
  icon: "folder",
  nameAr: "",
  nameEn: "",
  slugAr: "",
  slugEn: "",
  descriptionAr: "",
  descriptionEn: "",
});

function toDraft(cat: CategoryDoc): Draft {
  return {
    id: cat.id,
    parentId: cat.parentId || "",
    order: cat.order || 0,
    showInNav: cat.showInNav !== false,
    enabled: cat.enabled !== false,
    icon: cat.icon || cat.id,
    nameAr: cat.locales.ar?.name || "",
    nameEn: cat.locales.en?.name || "",
    slugAr: cat.locales.ar?.slug || "",
    slugEn: cat.locales.en?.slug || "",
    descriptionAr: cat.locales.ar?.description || "",
    descriptionEn: cat.locales.en?.description || "",
  };
}

function displayName(cat: CategoryDoc) {
  return cat.locales.en?.name || cat.locales.ar?.name || cat.id;
}

export function CategoriesPanel() {
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (syncNav = false) => {
    setLoading(true);
    try {
      const path = syncNav
        ? "/api/cms/categories?all=1&syncNav=1"
        : "/api/cms/categories?all=1";
      const res = await firebaseAuthorizedFetch(path);
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Unable to load categories.");
        return;
      }
      setCategories(data.categories || []);
      setMessage(
        data.synced
          ? "Navbar categories synced. The public menu now mirrors this tree."
          : "",
      );
    } catch {
      setMessage("Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  const roots = useMemo(
    () => categories.filter((cat) => !cat.parentId).sort((a, b) => a.order - b.order),
    [categories],
  );

  const childrenOf = useCallback(
    (parentId: string) =>
      categories.filter((cat) => cat.parentId === parentId).sort((a, b) => a.order - b.order),
    [categories],
  );

  function startCreate(parentId = "") {
    setEditingId(null);
    setDraft({
      ...emptyDraft(),
      parentId,
      order: categories.length,
    });
  }

  function startEdit(cat: CategoryDoc) {
    setEditingId(cat.id);
    setDraft(toDraft(cat));
  }

  async function save() {
    if (!draft.nameAr.trim() && !draft.nameEn.trim()) {
      setMessage("Add an Arabic or English name.");
      return;
    }
    setSaving(true);
    try {
      const res = await firebaseAuthorizedFetch("/api/cms/categories", {
        method: editingId ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: editingId || draft.id || undefined,
          parentId: draft.parentId || null,
          order: draft.order,
          showInNav: draft.showInNav,
          enabled: draft.enabled,
          icon: draft.icon,
          nameAr: draft.nameAr,
          nameEn: draft.nameEn,
          slugAr: draft.slugAr,
          slugEn: draft.slugEn,
          descriptionAr: draft.descriptionAr,
          descriptionEn: draft.descriptionEn,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Save failed.");
        return;
      }
      setMessage(editingId ? "Category updated." : "Category created.");
      setDraft(emptyDraft());
      setEditingId(null);
      await load();
    } catch {
      setMessage("Save failed.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this category? Posts keep their IDs until you reassign them.")) return;
    try {
      const res = await firebaseAuthorizedFetch(`/api/cms/categories?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Delete failed.");
        return;
      }
      if (editingId === id) {
        setEditingId(null);
        setDraft(emptyDraft());
      }
      setMessage("Category deleted.");
      await load();
    } catch {
      setMessage("Delete failed.");
    }
  }

  const parentOptions = roots.filter((cat) => cat.id !== editingId);
  const navCount = categories.filter((cat) => cat.showInNav !== false && cat.enabled !== false).length;

  return (
    <div className="admin-view cms-page">
      <header className="cms-page-header">
        <div>
          <p className="micro-label">Taxonomy</p>
          <h2>Categories</h2>
          <p className="cms-page-lead">
            Manage top-level categories and nested subcategories. Items marked for the navbar appear in
            the public menu exactly as structured here.
          </p>
        </div>
        <div className="cms-page-actions">
          <button type="button" className="btn-secondary" onClick={() => void load(true)}>
            Sync navbar tree
          </button>
          <button type="button" className="btn-primary" onClick={() => startCreate()}>
            + New category
          </button>
        </div>
      </header>

      <div className="cms-stat-strip">
        <article>
          <span>Total</span>
          <strong>{categories.length}</strong>
        </article>
        <article>
          <span>Top level</span>
          <strong>{roots.length}</strong>
        </article>
        <article>
          <span>In navbar</span>
          <strong>{navCount}</strong>
        </article>
      </div>

      {message ? <p className="cms-banner">{message}</p> : null}

      <div className="cms-split">
        <section className="cms-card">
          <div className="cms-card-head">
            <h3>Category tree</h3>
            <small>{loading ? "Loading…" : `${roots.length} groups`}</small>
          </div>

          {loading ? (
            <p className="cms-empty">Loading categories…</p>
          ) : categories.length === 0 ? (
            <div className="cms-empty-state">
              <p>No categories yet.</p>
              <button type="button" className="btn-primary" onClick={() => startCreate()}>
                Create the first category
              </button>
            </div>
          ) : (
            <div className="cat-tree">
              {roots.map((root) => {
                const children = childrenOf(root.id);
                const selected = editingId === root.id;
                return (
                  <article
                    key={root.id}
                    className={`cat-group${selected ? " is-selected" : ""}`}
                  >
                    <div className="cat-row">
                      <span className="cat-icon">
                        <NavIcon name={root.icon || root.id} />
                      </span>
                      <div className="cat-copy">
                        <strong>{displayName(root)}</strong>
                        <small>
                          {root.locales.ar?.name || "—"} · /category/{root.locales.en?.slug || root.id}
                        </small>
                        <div className="cat-badges">
                          {root.showInNav !== false ? (
                            <span className="badge badge-nav">Navbar</span>
                          ) : (
                            <span className="badge badge-muted">Hidden</span>
                          )}
                          {root.enabled === false ? (
                            <span className="badge badge-warn">Disabled</span>
                          ) : null}
                          <span className="badge badge-muted">{children.length} sub</span>
                        </div>
                      </div>
                      <div className="cat-actions">
                        <button type="button" onClick={() => startEdit(root)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => startCreate(root.id)}>
                          + Sub
                        </button>
                        <button type="button" className="danger" onClick={() => void remove(root.id)}>
                          Delete
                        </button>
                      </div>
                    </div>

                    {children.length > 0 ? (
                      <div className="cat-children">
                        {children.map((child) => (
                          <div
                            key={child.id}
                            className={`cat-row cat-child${editingId === child.id ? " is-selected" : ""}`}
                          >
                            <span className="cat-icon">
                              <NavIcon name={child.icon || child.id} />
                            </span>
                            <div className="cat-copy">
                              <strong>{displayName(child)}</strong>
                              <small>/category/{child.locales.en?.slug || child.id}</small>
                              <div className="cat-badges">
                                {child.showInNav !== false ? (
                                  <span className="badge badge-nav">Navbar</span>
                                ) : (
                                  <span className="badge badge-muted">Hidden</span>
                                )}
                              </div>
                            </div>
                            <div className="cat-actions">
                              <button type="button" onClick={() => startEdit(child)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="danger"
                                onClick={() => void remove(child.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="cms-card cms-card-sticky">
          <div className="cms-card-head">
            <h3>{editingId ? "Edit category" : "Create category"}</h3>
            <small>{editingId ? editingId : "New item"}</small>
          </div>

          <div className="cms-form-section">
            <h4>Names</h4>
            <div className="form-grid">
              <label>
                English name
                <input
                  value={draft.nameEn}
                  onChange={(e) => setDraft({ ...draft, nameEn: e.target.value })}
                />
              </label>
              <label>
                Arabic name
                <input
                  value={draft.nameAr}
                  onChange={(e) => setDraft({ ...draft, nameAr: e.target.value })}
                  dir="rtl"
                />
              </label>
              <label>
                English slug
                <input
                  value={draft.slugEn}
                  onChange={(e) => setDraft({ ...draft, slugEn: e.target.value })}
                  placeholder="auto from name"
                />
              </label>
              <label>
                Arabic slug
                <input
                  value={draft.slugAr}
                  onChange={(e) => setDraft({ ...draft, slugAr: e.target.value })}
                  placeholder="auto from name"
                />
              </label>
            </div>
          </div>

          <div className="cms-form-section">
            <h4>Structure</h4>
            <div className="form-grid">
              <label>
                Parent category
                <select
                  value={draft.parentId}
                  onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
                >
                  <option value="">— Top level —</option>
                  {parentOptions.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {displayName(cat)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Order
                <input
                  type="number"
                  value={draft.order}
                  onChange={(e) => setDraft({ ...draft, order: Number(e.target.value) || 0 })}
                />
              </label>
            </div>
          </div>

          <div className="cms-form-section">
            <h4>Icon</h4>
            <div className="icon-picker">
              {ICON_OPTIONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`icon-picker-btn${draft.icon === icon ? " active" : ""}`}
                  onClick={() => setDraft({ ...draft, icon })}
                  title={icon}
                >
                  <NavIcon name={icon} />
                </button>
              ))}
            </div>
          </div>

          <div className="cms-form-section">
            <h4>Descriptions</h4>
            <div className="form-grid">
              <label className="full-field">
                English description
                <textarea
                  rows={2}
                  value={draft.descriptionEn}
                  onChange={(e) => setDraft({ ...draft, descriptionEn: e.target.value })}
                />
              </label>
              <label className="full-field">
                Arabic description
                <textarea
                  rows={2}
                  dir="rtl"
                  value={draft.descriptionAr}
                  onChange={(e) => setDraft({ ...draft, descriptionAr: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="cms-form-section">
            <h4>Visibility</h4>
            <div className="cms-toggle-row">
              <label className="cms-toggle">
                <input
                  type="checkbox"
                  checked={draft.showInNav}
                  onChange={(e) => setDraft({ ...draft, showInNav: e.target.checked })}
                />
                <span>
                  <strong>Show in navbar</strong>
                  <small>Appears in the public menu under its parent</small>
                </span>
              </label>
              <label className="cms-toggle">
                <input
                  type="checkbox"
                  checked={draft.enabled}
                  onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
                />
                <span>
                  <strong>Enabled</strong>
                  <small>Available for post assignment and public pages</small>
                </span>
              </label>
            </div>
          </div>

          <div className="cms-form-footer">
            <button
              type="button"
              className="btn-primary"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? "Saving…" : editingId ? "Update category" : "Create category"}
            </button>
            {(editingId || draft.nameEn || draft.nameAr) && (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft());
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
