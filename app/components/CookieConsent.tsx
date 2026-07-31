"use client";

import { useEffect, useState } from "react";
import type { Locale } from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";

export type ConsentState = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
};

const STORAGE_KEY = "fikra_consent";

export function readConsent(): ConsentState {
  if (typeof window === "undefined") {
    return { necessary: true, analytics: false, marketing: false, decided: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { necessary: true, analytics: false, marketing: false, decided: false };
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      decided: Boolean(parsed.decided),
    };
  } catch {
    return { necessary: true, analytics: false, marketing: false, decided: false };
  }
}

function writeConsent(state: ConsentState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("fikra-consent", { detail: state }));
}

export function CookieConsent({ locale }: { locale: Locale }) {
  const t = createTranslator(locale);
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const current = readConsent();
    setAnalytics(current.analytics);
    setMarketing(current.marketing);
    setOpen(!current.decided);
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        className="cookie-manage"
        onClick={() => setOpen(true)}
      >
        {t("common.cookieBanner.customize")}
      </button>
    );
  }

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-live="polite">
      <div className="cookie-banner-inner">
        <h2 id="cookie-title">{t("common.cookieBanner.title")}</h2>
        <p>{t("common.cookieBanner.description")}</p>
        {customize && (
          <div className="cookie-options">
            <label>
              <input type="checkbox" checked disabled /> {t("common.cookieBanner.necessary")}
            </label>
            <label>
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
              />{" "}
              {t("common.cookieBanner.analytics")}
            </label>
            <label>
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
              />{" "}
              {t("common.cookieBanner.marketing")}
            </label>
          </div>
        )}
        <div className="cookie-actions">
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              writeConsent({ necessary: true, analytics: true, marketing: true, decided: true });
              setOpen(false);
            }}
          >
            {t("common.cookieBanner.acceptAll")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              writeConsent({ necessary: true, analytics: false, marketing: false, decided: true });
              setOpen(false);
            }}
          >
            {t("common.cookieBanner.rejectNonEssential")}
          </button>
          {!customize ? (
            <button type="button" className="btn-link" onClick={() => setCustomize(true)}>
              {t("common.cookieBanner.customize")}
            </button>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                writeConsent({ necessary: true, analytics, marketing, decided: true });
                setOpen(false);
              }}
            >
              {t("common.cookieBanner.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
