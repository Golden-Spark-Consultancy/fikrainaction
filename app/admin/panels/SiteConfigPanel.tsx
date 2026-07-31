"use client";

import { useEffect, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";
import type { HomepageSection, MenuDoc, SiteSettings } from "../../../lib/types/cms";
import { ToolsPanel } from "./ToolsPanel";

type TaxItem = {
  id: string;
  locales?: {
    ar?: { name?: string; slug?: string };
    en?: { name?: string; slug?: string };
  };
};

export function SiteConfigPanel() {
  const [header, setHeader] = useState<MenuDoc | null>(null);
  const [footer, setFooter] = useState<MenuDoc | null>(null);
  const [sections, setSections] = useState<HomepageSection[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [categories, setCategories] = useState<TaxItem[]>([]);
  const [tags, setTags] = useState<TaxItem[]>([]);
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<
    "branding" | "menus" | "homepage" | "taxonomy" | "comments" | "seo" | "ai" | "tools"
  >("branding");

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
    setCategories(data.categories || []);
    setTags(data.tags || []);
  }

  useEffect(() => {
    void load().catch(() => setMessage("Unable to load config"));
  }, []);

  async function save(kind: string, data: Record<string, unknown>) {
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

  async function saveTaxonomy(kind: "category" | "tag", item: {
    id?: string;
    nameAr: string;
    nameEn: string;
    slugAr: string;
    slugEn: string;
  }) {
    const res = await firebaseAuthorizedFetch("/api/cms/config", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, data: item }),
    });
    const payload = await res.json();
    if (!res.ok) {
      setMessage(payload.error || "Taxonomy save failed");
      return;
    }
    setMessage(`${kind} saved.`);
    await load();
  }

  const [newCat, setNewCat] = useState({ nameAr: "", nameEn: "", slugAr: "", slugEn: "" });
  const [newTag, setNewTag] = useState({ nameAr: "", nameEn: "", slugAr: "", slugEn: "" });

  return (
    <div className="admin-view">
      <section className="admin-panel">
        <div className="editor-tabs">
          {(
            [
              ["branding", "Branding"],
              ["menus", "Navigation"],
              ["homepage", "Homepage"],
              ["taxonomy", "Categories & tags"],
              ["comments", "Comments"],
              ["seo", "SEO & analytics"],
              ["ai", "AI settings"],
              ["tools", "Users / redirects / IO"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "active" : ""}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "branding" && settings && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              Site name
              <input
                value={settings.siteName || ""}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </label>
            <label>
              Default language
              <select
                value={settings.defaultLocale}
                onChange={(e) =>
                  setSettings({ ...settings, defaultLocale: e.target.value as "ar" | "en" })
                }
              >
                <option value="ar">Arabic</option>
                <option value="en">English</option>
              </select>
            </label>
            <label className="full-field">
              Description (Arabic)
              <textarea
                rows={2}
                value={settings.siteDescription?.ar || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    siteDescription: { ...settings.siteDescription, ar: e.target.value },
                  })
                }
              />
            </label>
            <label className="full-field">
              Description (English)
              <textarea
                rows={2}
                value={settings.siteDescription?.en || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    siteDescription: { ...settings.siteDescription, en: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Logo URL
              <input
                value={settings.branding?.logoUrl || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branding: { ...settings.branding, logoUrl: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Favicon URL
              <input
                value={settings.branding?.faviconUrl || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    branding: { ...settings.branding, faviconUrl: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Default featured image URL
              <input
                value={settings.defaultFeaturedImageUrl || ""}
                onChange={(e) =>
                  setSettings({ ...settings, defaultFeaturedImageUrl: e.target.value })
                }
              />
            </label>
            <label>
              Posts per page
              <input
                type="number"
                min={1}
                max={48}
                value={settings.postsPerPage || 12}
                onChange={(e) =>
                  setSettings({ ...settings, postsPerPage: Number(e.target.value) })
                }
              />
            </label>
            <label className="full-field">
              Affiliate disclosure (Arabic)
              <textarea
                rows={2}
                value={settings.affiliateDisclosure?.ar || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    affiliateDisclosure: {
                      ...settings.affiliateDisclosure,
                      ar: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="full-field">
              Affiliate disclosure (English)
              <textarea
                rows={2}
                value={settings.affiliateDisclosure?.en || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    affiliateDisclosure: {
                      ...settings.affiliateDisclosure,
                      en: e.target.value,
                    },
                  })
                }
              />
            </label>
            <label>
              Twitter / X
              <input
                value={settings.socialLinks?.twitter || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, twitter: e.target.value },
                  })
                }
              />
            </label>
            <label>
              YouTube
              <input
                value={settings.socialLinks?.youtube || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, youtube: e.target.value },
                  })
                }
              />
            </label>
            <label>
              LinkedIn
              <input
                value={settings.socialLinks?.linkedin || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    socialLinks: { ...settings.socialLinks, linkedin: e.target.value },
                  })
                }
              />
            </label>
            <label>
              Notification email
              <input
                type="email"
                value={settings.notificationEmail || ""}
                onChange={(e) =>
                  setSettings({ ...settings, notificationEmail: e.target.value })
                }
              />
            </label>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("settings", settings as unknown as Record<string, unknown>)}
            >
              Save branding & site settings
            </button>
          </div>
        )}

        {tab === "menus" && header && footer && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label className="full-field">
              Header menu JSON
              <textarea
                rows={10}
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
                rows={10}
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

        {tab === "taxonomy" && (
          <div className="admin-management-layout" style={{ marginTop: 16 }}>
            <section className="admin-panel" style={{ margin: 0 }}>
              <h3>Categories</h3>
              <div className="content-card-list">
                {categories.map((cat) => (
                  <article key={cat.id}>
                    <div>
                      <strong>{cat.locales?.en?.name || cat.locales?.ar?.name || cat.id}</strong>
                      <small>
                        ar: {cat.locales?.ar?.slug} · en: {cat.locales?.en?.slug}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <label>Name AR<input value={newCat.nameAr} onChange={(e) => setNewCat({ ...newCat, nameAr: e.target.value })} /></label>
                <label>Name EN<input value={newCat.nameEn} onChange={(e) => setNewCat({ ...newCat, nameEn: e.target.value })} /></label>
                <label>Slug AR<input value={newCat.slugAr} onChange={(e) => setNewCat({ ...newCat, slugAr: e.target.value })} /></label>
                <label>Slug EN<input value={newCat.slugEn} onChange={(e) => setNewCat({ ...newCat, slugEn: e.target.value })} /></label>
                <button type="button" className="generate-button" onClick={() => void saveTaxonomy("category", newCat)}>
                  Add category
                </button>
              </div>
            </section>
            <section className="admin-panel" style={{ margin: 0 }}>
              <h3>Tags</h3>
              <div className="content-card-list">
                {tags.map((tag) => (
                  <article key={tag.id}>
                    <div>
                      <strong>{tag.locales?.en?.name || tag.locales?.ar?.name || tag.id}</strong>
                      <small>
                        ar: {tag.locales?.ar?.slug} · en: {tag.locales?.en?.slug}
                      </small>
                    </div>
                  </article>
                ))}
              </div>
              <div className="form-grid" style={{ marginTop: 12 }}>
                <label>Name AR<input value={newTag.nameAr} onChange={(e) => setNewTag({ ...newTag, nameAr: e.target.value })} /></label>
                <label>Name EN<input value={newTag.nameEn} onChange={(e) => setNewTag({ ...newTag, nameEn: e.target.value })} /></label>
                <label>Slug AR<input value={newTag.slugAr} onChange={(e) => setNewTag({ ...newTag, slugAr: e.target.value })} /></label>
                <label>Slug EN<input value={newTag.slugEn} onChange={(e) => setNewTag({ ...newTag, slugEn: e.target.value })} /></label>
                <button type="button" className="generate-button" onClick={() => void saveTaxonomy("tag", newTag)}>
                  Add tag
                </button>
              </div>
            </section>
          </div>
        )}

        {tab === "comments" && settings && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.commentsEnabled}
                onChange={(e) => setSettings({ ...settings, commentsEnabled: e.target.checked })}
              />{" "}
              Enable comments globally
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.commentsRequireModeration}
                onChange={(e) =>
                  setSettings({ ...settings, commentsRequireModeration: e.target.checked })
                }
              />{" "}
              Require moderation
            </label>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.commentsAllowReplies}
                onChange={(e) =>
                  setSettings({ ...settings, commentsAllowReplies: e.target.checked })
                }
              />{" "}
              Allow replies
            </label>
            <label>
              Auto-close after days
              <input
                type="number"
                value={settings.commentsCloseAfterDays ?? ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    commentsCloseAfterDays: e.target.value ? Number(e.target.value) : null,
                  })
                }
              />
            </label>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("settings", settings as unknown as Record<string, unknown>)}
            >
              Save comment settings
            </button>
          </div>
        )}

        {tab === "seo" && settings && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              GA measurement ID
              <input
                value={settings.analytics?.googleAnalyticsId || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    analytics: { ...settings.analytics, googleAnalyticsId: e.target.value },
                  })
                }
                placeholder="G-XXXXXXXX"
              />
            </label>
            <label>
              GTM container ID
              <input
                value={settings.analytics?.googleTagManagerId || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    analytics: { ...settings.analytics, googleTagManagerId: e.target.value },
                  })
                }
                placeholder="GTM-XXXXXXX"
              />
            </label>
            <p className="admin-section-intro">
              Analytics IDs are stored in site settings for server-rendered injection. Sensitive API keys must stay in environment variables, never in this form.
            </p>
            <label className="check-label">
              <input
                type="checkbox"
                checked={settings.youtubeEmbedsEnabled !== false}
                onChange={(e) =>
                  setSettings({ ...settings, youtubeEmbedsEnabled: e.target.checked })
                }
              />{" "}
              Allow YouTube embeds
            </label>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("settings", settings as unknown as Record<string, unknown>)}
            >
              Save SEO & analytics
            </button>
          </div>
        )}

        {tab === "ai" && settings && (
          <div className="form-grid" style={{ marginTop: 16 }}>
            <label>
              Max posts per AI batch
              <input
                type="number"
                min={1}
                max={25}
                value={settings.aiSettings?.maxPostsPerBatch || 10}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiSettings: {
                      ...settings.aiSettings,
                      maxPostsPerBatch: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
            <label>
              Default AI language
              <select
                value={settings.aiSettings?.defaultLanguage || "both"}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiSettings: {
                      ...settings.aiSettings,
                      defaultLanguage: e.target.value as "ar" | "en" | "both",
                    },
                  })
                }
              >
                <option value="ar">Arabic</option>
                <option value="en">English</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="full-field">
              Default writing style
              <input
                value={settings.aiSettings?.defaultStyle || ""}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    aiSettings: { ...settings.aiSettings, defaultStyle: e.target.value },
                  })
                }
              />
            </label>
            <p className="admin-section-intro">
              Gemini / AI provider API keys are read only from secure server environment variables (`GEMINI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`).
            </p>
            <button
              type="button"
              className="generate-button"
              onClick={() => void save("settings", settings as unknown as Record<string, unknown>)}
            >
              Save AI settings
            </button>
          </div>
        )}

        {tab === "tools" && <div style={{ marginTop: 16 }}><ToolsPanel /></div>}

        {message && <div className="status-message">{message}</div>}
      </section>
    </div>
  );
}
