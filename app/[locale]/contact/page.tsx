"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { isLocale, type Locale } from "../../../lib/i18n/config";
import { createTranslator } from "../../../lib/i18n/translate";

export default function ContactPage() {
  const params = useParams<{ locale: string }>();
  const raw = params?.locale || "ar";
  const locale: Locale = isLocale(raw) ? raw : "ar";
  const t = createTranslator(locale);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        subject: data.get("subject"),
        message: data.get("message"),
        consent: data.get("consent") === "true",
        locale,
        honeypot: data.get("honeypot") || "",
      }),
    });
    setStatus(res.ok ? t("common.contact.success") : t("common.error"));
    if (res.ok) event.currentTarget.reset();
  }

  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("common.contact.title")}</h1>
      <form className="newsletter-form" onSubmit={onSubmit} style={{ marginTop: 24, color: "inherit" }}>
        <label>
          {t("common.contact.name")}
          <input name="name" required />
        </label>
        <label>
          {t("common.contact.email")}
          <input name="email" type="email" required />
        </label>
        <label>
          {t("common.contact.subject")}
          <input name="subject" required />
        </label>
        <label>
          {t("common.contact.message")}
          <textarea name="message" rows={6} required />
        </label>
        <label className="consent-row" style={{ color: "inherit" }}>
          <input type="checkbox" name="consent" value="true" required />
          {t("common.contact.consent")}
        </label>
        <input className="hp-field" name="honeypot" tabIndex={-1} autoComplete="off" aria-hidden="true" />
        <button type="submit">{t("common.contact.submit")}</button>
        {status && <p>{status}</p>}
      </form>
    </main>
  );
}
