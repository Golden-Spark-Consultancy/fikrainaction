"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { readConsent, type ConsentState } from "./CookieConsent";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim();
const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-YHBQM8LF95";

function valid(value: string | undefined, pattern: RegExp) {
  return value && pattern.test(value) ? value : "";
}

export function Tracking() {
  const [consent, setConsent] = useState<ConsentState>({
    necessary: true,
    analytics: false,
    marketing: false,
    decided: false,
  });
  const gtm = valid(gtmId, /^GTM-[A-Z0-9]+$/i);
  const ads = valid(adsId, /^AW-\d+$/i);
  const label = valid(conversionLabel, /^[A-Za-z0-9_-]+$/);
  const ga = valid(gaId, /^G-[A-Z0-9]+$/i);

  useEffect(() => {
    setConsent(readConsent());
    function onConsent(event: Event) {
      const detail = (event as CustomEvent<ConsentState>).detail;
      if (detail) setConsent(detail);
    }
    window.addEventListener("fikra-consent", onConsent);
    return () => window.removeEventListener("fikra-consent", onConsent);
  }, []);

  useEffect(() => {
    if (!consent.analytics && !consent.marketing) return;
    function trackAffiliateClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
      if (!link || !(link.rel.includes("sponsored") || link.pathname.startsWith("/go/"))) return;
      window.dataLayer?.push({
        event: "affiliate_click",
        affiliate_url: link.href,
        link_text: link.textContent?.trim() || "",
      });
      if (ads && label && window.gtag) {
        window.gtag("event", "conversion", {
          send_to: `${ads}/${label}`,
          value: 1.0,
          currency: "USD",
          event_callback: () => undefined,
        });
      }
    }
    document.addEventListener("click", trackAffiliateClick, { capture: true });
    return () => document.removeEventListener("click", trackAffiliateClick, { capture: true });
  }, [ads, label, consent.analytics, consent.marketing]);

  const loadAnalytics = consent.analytics;
  const loadMarketing = consent.marketing;

  return (
    <>
      {loadAnalytics && gtm && (
        <Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
      )}
      {loadAnalytics && ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga4-config" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};gtag('js', new Date());gtag('config','${ga}',{anonymize_ip:true});`}</Script>
        </>
      )}
      {loadMarketing && ads && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ads}`} strategy="afterInteractive" />
          <Script id="google-ads" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){dataLayer.push(arguments)};gtag('config','${ads}');`}</Script>
        </>
      )}
    </>
  );
}

export function TagManagerNoScript() {
  const gtm = valid(gtmId, /^GTM-[A-Z0-9]+$/i);
  return gtm ? (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtm}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  ) : null;
}
