"use client";

import { useEffect, useState } from "react";
import { firebaseAuthorizedFetch } from "../../../lib/firebase/api";

export function ToolsPanel() {
  const [redirects, setRedirects] = useState<
    { id: string; fromPath: string; toPath: string; statusCode: number }[]
  >([]);
  const [fromPath, setFromPath] = useState("");
  const [toPath, setToPath] = useState("");
  const [users, setUsers] = useState<{ uid?: string; email?: string; role?: string }[]>([]);
  const [message, setMessage] = useState("");
  const [importJson, setImportJson] = useState("[]");

  async function load() {
    const [redirRes, usersRes] = await Promise.all([
      firebaseAuthorizedFetch("/api/cms/redirects"),
      firebaseAuthorizedFetch("/api/cms/users"),
    ]);
    const redirData = await redirRes.json();
    const usersData = await usersRes.json();
    if (redirRes.ok) setRedirects(redirData.redirects || []);
    if (usersRes.ok) setUsers(usersData.users || []);
    if (!redirRes.ok && !usersRes.ok) setMessage("Unable to load tools data (owner/admin required for some actions).");
  }

  useEffect(() => {
    void load().catch(() => undefined);
  }, []);

  async function addRedirect() {
    const res = await firebaseAuthorizedFetch("/api/cms/redirects", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromPath, toPath, statusCode: 301 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed");
      return;
    }
    setFromPath("");
    setToPath("");
    setMessage("Redirect saved.");
    await load();
  }

  async function exportArticles(format: "json" | "csv") {
    const res = await firebaseAuthorizedFetch(`/api/cms/import-export?type=articles&format=${format}`);
    if (!res.ok) {
      const data = await res.json();
      setMessage(data.error || "Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = format === "csv" ? "articles.csv" : "articles.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function dryRunImport() {
    const items = JSON.parse(importJson) as Record<string, unknown>[];
    const res = await firebaseAuthorizedFetch("/api/cms/import-export", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "articles", dryRun: true, items }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? `Dry-run: created=${data.created} skipped=${data.skipped} conflicts=${data.conflicts}`
        : data.error || "Import failed",
    );
  }

  return (
    <div className="admin-view admin-management-layout">
      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="micro-label">SEO</p>
            <h2>Redirects</h2>
          </div>
        </div>
        <div className="form-grid">
          <label>
            From path
            <input value={fromPath} onChange={(e) => setFromPath(e.target.value)} placeholder="/en/old-slug" />
          </label>
          <label>
            To path
            <input value={toPath} onChange={(e) => setToPath(e.target.value)} placeholder="/en/new-slug" />
          </label>
        </div>
        <button type="button" className="generate-button" onClick={() => void addRedirect()}>
          Add redirect
        </button>
        <div className="content-card-list" style={{ marginTop: 16 }}>
          {redirects.map((item) => (
            <article key={item.id}>
              <div>
                <strong>{item.fromPath}</strong>
                <small>
                  → {item.toPath} ({item.statusCode})
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-panel">
        <div className="panel-title">
          <div>
            <p className="micro-label">Data</p>
            <h2>Import / export</h2>
          </div>
        </div>
        <div className="editor-actions">
          <button type="button" onClick={() => void exportArticles("json")}>Export JSON</button>
          <button type="button" onClick={() => void exportArticles("csv")}>Export CSV</button>
        </div>
        <label className="full-field">
          Import articles JSON (dry-run)
          <textarea rows={8} value={importJson} onChange={(e) => setImportJson(e.target.value)} />
        </label>
        <button type="button" className="generate-button" onClick={() => void dryRunImport()}>
          Dry-run import
        </button>

        <h3 style={{ marginTop: 28 }}>Users</h3>
        <div className="content-card-list">
          {users.map((user) => (
            <article key={user.uid || user.email}>
              <div>
                <strong>{user.email}</strong>
                <small>{user.role || "unknown"} · {user.uid}</small>
              </div>
            </article>
          ))}
        </div>
        {!users.length && (
          <p className="admin-section-intro">
            Users appear after roles are assigned with `npm run firebase:set-role`.
          </p>
        )}
        {message && <div className="status-message">{message}</div>}
      </section>
    </div>
  );
}
