"use client";

import { useState } from "react";
import type { Locale } from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";

export function CommentSection({
  locale,
  postId,
  enabled,
}: {
  locale: Locale;
  postId: string;
  enabled: boolean;
}) {
  const t = createTranslator(locale);
  const [status, setStatus] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    body: "",
    policyAccepted: false,
  });

  if (!enabled) {
    return <p className="affiliate-notice">{t("common.comments.closed")}</p>;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postId,
        locale,
        displayName: form.displayName,
        email: form.email,
        body: form.body,
        policyAccepted: form.policyAccepted,
        honeypot: "",
      }),
    });
    if (res.ok) {
      setStatus(t("common.comments.pending"));
      setForm({ displayName: "", email: "", body: "", policyAccepted: false });
      setPreview(false);
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus(data.error || t("common.error"));
    }
  }

  return (
    <section className="comments-section" aria-labelledby="comments-title">
      <h2 id="comments-title">{t("common.comments.title")}</h2>
      <p className="empty-state">{t("common.comments.empty")}</p>
      <form className="comment-form" onSubmit={submit}>
        <label>
          {t("common.comments.name")}
          <input
            required
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          />
        </label>
        <label>
          {t("common.comments.emailOptional")}
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          {t("common.comments.body")}
          <textarea
            required
            rows={5}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <label className="consent-row">
          <input
            type="checkbox"
            checked={form.policyAccepted}
            onChange={(e) => setForm({ ...form, policyAccepted: e.target.checked })}
            required
          />
          {t("common.comments.policyAccept")}
        </label>
        <div className="cookie-actions">
          <button type="button" className="btn-secondary" onClick={() => setPreview(!preview)}>
            {t("common.comments.preview")}
          </button>
          <button type="submit" className="btn-primary">
            {t("common.comments.submit")}
          </button>
        </div>
        {preview && (
          <aside className="callout callout-info" aria-live="polite">
            <strong>{form.displayName || "…"}</strong>
            <p>{form.body}</p>
          </aside>
        )}
        {status && <p className="status-message">{status}</p>}
      </form>
    </section>
  );
}
