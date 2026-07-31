"use client";

import { useEffect, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";
import type { HomepageSection, MenuDoc, SiteSettings } from "../../../lib/types/cms";

export function SiteConfigPanel() {
  const [header, setHeader] = useState<MenuDoc | null>(null);
  const [footer, setFooter] = useState<MenuDoc | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<"menus" | "homepage" | "settings">("menus");

  async function load() {
    const res = await firebaseAuthorizedFetch("/api/cms/config");
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Unable to load config");
      return;
    }
    setHeader(data.header);
    setFooter(data.footer);
    setSections(data.sections || []);
    setSettings(data.settings);
  }

  useEffect(() => {
    void load().catch(() => setMessage("Unable to load config"));
  }, []);

  async function save(kind: "header" | "footer" | "homepage" | "settings", data: Record<string, unknown>) {
    const res = await firebaseAuthorizedFetch("/api/cms/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, data }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || "Save failed");
      return;
    }
    setMessage("Saved.");
    await load();
  }

  return (
    <div className="admin-view">
      <section className="admin-panel">
        <div className="editor-tabs">
          <button type="button" className={tab === "menus" ? "active" : ""} onClick={() => setTab("menus")}>
            Navigation
          </button>
          <button type="button" className={tab === "homepage" ? "active" : ""} onClick={() => setTab("homepage")}>
            Homepage
          </button>
          <button type="button" className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
            Settings
          </button>
        </div>

        {tab === "menus" && header && footer && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label className="full-field">
              Header menu JSON
              <textarea
                rows={12}
                value={JSON.stringify(header.items, null, 2)}
                onChange={(e) => {
                  try {
                    setHeader({ ...header, items: JSON.parse(e.target.value) });
                  } catch {
                    /* keep typing */
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("header", header as unknown as Record<string, unknown>)}
            >
              Save header menu
            </button>
            <label className="full-field">
              Footer menu JSON
              <textarea
                rows={12}
                value={JSON.stringify(footer.items, null, 2)}
                onChange={(e) => {
                  try {
                    setFooter({ ...footer, items: JSON.parse(e.target.value) });
                  } catch {
                    /* keep typing */
                  }
                }}
              />
            </label>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("footer", footer as unknown as Record<string, unknown>)}
            >
              Save footer menu
            </button>
          </div>
        )}

        {tab === "homepage" && (
          <div style={{ marginTop: 16 }}>
            {sections
              .slice()
              .sort((a, b) => a.order - b.order)
              .map((section, index) => (
                <div key={section.id} className="page-row">
                  <span>
                    <strong>{section.type}</strong>
                    <small>
                      {section.heading.en} / {section.heading.ar}
                    </small>
                  </span>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={section.enabled}
                      onChange={(e) => {
                        const next = [...sections];
                        next[index] = { ...section, enabled: e.target.checked };
                        setSections(next);
                      }}
                    />{" "}
                    Enabled
                  </label>
                  <input
                    type="number"
                    value={section.order}
                    onChange={(e) => {
                      const next = [...sections];
                      next[index] = { ...section, order: Number(e.target.value) };
                      setSections(next);
                    }}
                  />
                </div>
              ))}
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("homepage", { sections })}
            >
              Save homepage sections
            </button>
          </div>
        )}

        {tab === "settings" && settings && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              Default locale
              <select
                value={settings.defaultLocale}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    defaultLocale: e.target.value as "ar" | "en",
                  })
                }
              >
                <option value="ar">ar</option>
                <option value="en">en</option>
              </select>
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.commentsEnabled}
                onChange={(e) =>
                  setSettings({ ...settings, commentsEnabled: e.target.checked })
                }
              />{" "}
              Comments enabled
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.commentsRequireModeration}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    commentsRequireModeration: e.target.checked,
                  })
                }
              />{" "}
              Require moderation
            </label>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("settings", settings as unknown as Record<string, unknown>)}
            >
              Save settings
            </button>
          </div>
        )}
        {message && <div className="status-message">{message}</div>}
      </section>
    </div>
  );
}
