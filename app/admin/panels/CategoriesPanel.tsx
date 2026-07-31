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
    // First open: ensure navbar taxonomy exists in Firestore.
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

  return (
    <section className="admin-panel">
      <div className="panel-title">
        <div>
          <p className="micro-label">Taxonomy</p>
          <h2>Categories & subcategories</h2>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => void load(true)}>
            Sync navbar categories
          </button>
          <button type="button" onClick={() => startCreate()}>
            + New category
          </button>
        </div>
      </div>
      <p className="admin-section-intro">
        The public navbar shows only categories with <strong>Show in navbar</strong> enabled, nested under
        their parent. Sync creates the current navbar tree (AI & Automation, Software, Hardware, Guides &
        Reviews) so the menu always reflects this screen.
      </p>
      {message ? <p className="admin-inline-message">{message}</p> : null}

      <div className="admin-management-layout" style={{ marginTop: 16 }}>
        <section className="admin-panel" style={{ margin: 0 }}>
          <h3>Tree</h3>
          {loading ? (
            <p className="admin-section-intro">Loading…</p>
          ) : categories.length === 0 ? (
            <p className="admin-section-intro">No categories yet. Create your first one.</p>
          ) : (
            <div className="content-card-list category-admin-tree">
              {roots.map((root) => (
                <article key={root.id}>
                  <div className="category-admin-row">
                    <NavIcon name={root.icon || root.id} />
                    <div>
                      <strong>
                        {root.locales.en?.name || root.locales.ar?.name || root.id}
                        {!root.enabled ? " · disabled" : ""}
                        {root.showInNav === false ? " · hidden from nav" : ""}
                      </strong>
                      <small>
                        {root.locales.ar?.name || "—"} · /category/{root.locales.en?.slug || root.id}
                      </small>
                    </div>
                    <div className="category-admin-actions">
                      <button type="button" onClick={() => startEdit(root)}>
                        Edit
                      </button>
                      <button type="button" onClick={() => startCreate(root.id)}>
                        + Sub
                      </button>
                      <button type="button" onClick={() => void remove(root.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {childrenOf(root.id).map((child) => (
                    <div key={child.id} className="category-admin-row subcategory">
                      <NavIcon name={child.icon || child.id} />
                      <div>
                        <strong>
                          {child.locales.en?.name || child.locales.ar?.name || child.id}
                          {!child.enabled ? " · disabled" : ""}
                          {child.showInNav === false ? " · hidden from nav" : ""}
                        </strong>
                        <small>
                          under {root.locales.en?.name || root.id} · /category/
                          {child.locales.en?.slug || child.id}
                        </small>
                      </div>
                      <div className="category-admin-actions">
                        <button type="button" onClick={() => startEdit(child)}>
                          Edit
                        </button>
                        <button type="button" onClick={() => void remove(child.id)}>
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="admin-panel" style={{ margin: 0 }}>
          <h3>{editingId ? "Edit category" : "Create category"}</h3>
          <div className="form-grid" style={{ marginTop: 12 }}>
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
            <label>
              Parent category
              <select
                value={draft.parentId}
                onChange={(e) => setDraft({ ...draft, parentId: e.target.value })}
              >
                <option value="">— Top level —</option>
                {parentOptions.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.locales.en?.name || cat.locales.ar?.name || cat.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Icon
              <select
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
              >
                {ICON_OPTIONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
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
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.showInNav}
                onChange={(e) => setDraft({ ...draft, showInNav: e.target.checked })}
              />{" "}
              Show in navbar menu
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={draft.enabled}
                onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })}
              />{" "}
              Enabled
            </label>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button type="button" className="generate-button" disabled={saving} onClick={() => void save()}>
              {saving ? "Saving…" : editingId ? "Update category" : "Create category"}
            </button>
            {(editingId || draft.nameEn || draft.nameAr) && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setDraft(emptyDraft());
                }}
              >
                Cancel
              </button>
            )}
          </div>
          <p className="admin-section-intro" style={{ marginTop: 12 }}>
            Preview icon: <NavIcon name={draft.icon} /> {draft.icon}
          </p>
        </section>
      </div>
    </section>
  );
}
