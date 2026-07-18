"use client";

import { useEffect, useState, type ReactNode } from "react";

type Props = {
  slug: string;
  campaign: string;
  position?: string;
  className?: string;
  children: ReactNode;
};

function buildHref(slug: string, campaign: string, position?: string, extra?: URLSearchParams) {
  const query = new URLSearchParams({ campaign });
  if (position) query.set("position", position);
  if (extra) {
    const gclid = extra.get("gclid");
    const msclkid = extra.get("msclkid");
    if (gclid) query.set("gclid", gclid);
    if (msclkid) query.set("msclkid", msclkid);
  }
  return `/go/${slug}?${query.toString()}`;
}

/**
 * Affiliate call-to-action link. When the landing page was reached from a paid
 * ad, the ad platform appends a click ID (gclid / msclkid) to the page URL;
 * this component carries that ID into the /go redirect so the click can be
 * reconciled with network-side conversions later.
 */
export default function AffiliateCta({ slug, campaign, position, className, children }: Props) {
  const [href, setHref] = useState(() => buildHref(slug, campaign, position));

  useEffect(() => {
    const pageQuery = new URLSearchParams(window.location.search);
    if (pageQuery.get("gclid") || pageQuery.get("msclkid")) {
      setHref(buildHref(slug, campaign, position, pageQuery));
    }
  }, [slug, campaign, position]);

  return (
    <a href={href} rel="sponsored nofollow noopener" target="_blank" className={className}>
      {children}
    </a>
  );
}
