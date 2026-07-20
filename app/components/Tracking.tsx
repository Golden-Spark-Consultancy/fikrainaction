"use client";

import Script from "next/script";
import { useEffect } from "react";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
const gtmId = process.env.NEXT_PUBLIC_GTM_ID?.trim();
const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim();
const conversionLabel = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL?.trim();

function valid(value: string | undefined, pattern: RegExp) {
  return value && pattern.test(value) ? value : "";
}

export function Tracking() {
  const ga = valid(gaId, /^G-[A-Z0-9]+$/i);
  const gtm = valid(gtmId, /^GTM-[A-Z0-9]+$/i);
  const ads = valid(adsId, /^AW-\d+$/i);
  const label = valid(conversionLabel, /^[A-Za-z0-9_-]+$/);
  const gtagSource = ga || ads;

  useEffect(() => {
    function trackAffiliateClick(event: MouseEvent) {
      const link = (event.target as HTMLElement | null)?.closest("a") as HTMLAnchorElement | null;
      if (!link || !(link.rel.includes("sponsored") || link.pathname.startsWith("/go/"))) return;
      window.dataLayer?.push({ event: "affiliate_click", affiliate_url: link.href, link_text: link.textContent?.trim() || "" });
      if (ads && label && window.gtag) {
        window.gtag("event", "conversion", { send_to: `${ads}/${label}`, value: 1.0, currency: "USD", event_callback: () => undefined });
      }
    }
    document.addEventListener("click", trackAffiliateClick, { capture: true });
    return () => document.removeEventListener("click", trackAffiliateClick, { capture: true });
  }, [ads, label]);

  return <>
    {gtm && <>
      <Script id="google-tag-manager" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>
    </>}
    {gtagSource && <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gtagSource}`} strategy="afterInteractive" />
      <Script id="google-analytics-and-ads" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;gtag('js',new Date());${ga ? `gtag('config','${ga}',{send_page_view:true});` : ""}${ads ? `gtag('config','${ads}');` : ""}`}</Script>
    </>}
  </>;
}

export function TagManagerNoScript() {
  const gtm = valid(gtmId, /^GTM-[A-Z0-9]+$/i);
  return gtm ? <noscript><iframe src={`https://www.googletagmanager.com/ns.html?id=${gtm}`} height="0" width="0" style={{ display: "none", visibility: "hidden" }} title="Google Tag Manager" /></noscript> : null;
}
