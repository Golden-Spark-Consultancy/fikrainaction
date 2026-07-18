# Changes — Descript comparison page + Semrush campaign prep (18 July 2026)

## Files changed

| File | What it does |
|---|---|
| `app/compare/descript-vs-riverside/page.tsx` | **New.** Descript vs Riverside comparison page (organic traffic — see "Why no ads for Descript" below). Includes affiliate disclosure under the hero and before the first affiliate link, three `AffiliateCta` links (`campaign="descript-comparison"`, positions `short-answer` / `pricing` / `verdict`), official Descript YouTube embed via `youtube-nocookie.com` (video `qeWt9VcyZos`, from the @Descript channel), honest trade-offs incl. when Riverside or an NLE is the better choice, prices labeled "at the time of writing", and `FAQPage` JSON-LD. |
| `lib/data.ts` | Added `descript` to the static catalogue so `/go/descript` resolves before the Firestore doc exists. Fallback URL is the plain descript.com homepage (no tracking) until you set the real link. |
| `app/comparisons/page.tsx` | Registered the new comparison card. |
| `app/sitemap.ts` | Added `/compare/descript-vs-riverside`; also fixed `baseUrl` from `https://fikra-e47d9.web.app` to `https://fikrainaction.com` (was pointing search engines at the old Firebase URL). |
| `SEMRUSH-CAMPAIGN.md` | **New, not for deploy.** Ready-to-launch Google Ads plan for the existing `/compare/semrush-vs-ahrefs-vs-ubersuggest` page. You can keep it out of the commit if you prefer. |

## Verification performed

- `npx tsc --noEmit` — clean.
- `npm run build:next` — passes; `/compare/descript-vs-riverside` prerenders as static.
- Rendered-HTML smoke test: affiliate disclosure ×1, `youtube-nocookie.com/embed/qeWt9VcyZos` ×1, `FAQPage` ×1, `rel="sponsored nofollow noopener"` present, all three `/go/descript` CTA positions present.

## You must configure manually

1. **Descript affiliate link (PartnerStack).** When the PartnerStack dashboard recovers (its marketplace API was down today), copy your Descript tracking link and create the Firestore doc `products/descript` with `affiliateUrl: "<your PartnerStack link>"`. PartnerStack links generally accept a sub-ID query parameter (often `sid`) — verify the exact parameter name in your dashboard before setting `subIdParam`; for organic-only traffic it's optional.
2. **Semrush affiliate link (Impact).** Create/update `products/semrush` with `affiliateUrl: "<your semrush.sjv.io/c/... link from Impact → Content → Assets>"` and `subIdParam: "subId1"`. This is required before launching the ad campaign — without it, `/go/semrush` falls back to plain semrush.com and conversions won't be attributed.
3. Commit, push to `main`, wait for Firebase App Hosting deploy, then verify:
   - https://fikrainaction.com/compare/descript-vs-riverside
   - https://fikrainaction.com/comparisons (new card)
   - https://fikrainaction.com/sitemap.xml (new URL + corrected domain)

## Program terms verified today (re-verify before relying on them later)

- **Descript** (PartnerStack): $25 one-time flat per new qualifying subscription (Creator/Pro), 30-day click-to-purchase window, no keywords containing Descript marks, no direct linking from ads, and a clause that on a strict reading bars promoting Descript on Google at all. **This is why the Descript page is organic-only** — a $25 one-time payout can't beat realistic CPCs anyway. Source: descript.com/affiliate-terms.
- **Semrush** (Impact): $200 per new subscription sale + $10 per free-trial activation (base tier), 120-day cookie, last-click. No bidding on Semrush brand terms or misspellings; no direct linking. Source: semrush.com/kb/97-affiliate-program.

## Noticed but not fixed

- `app/comparisons/page.tsx` and `app/sitemap.ts` reference `/compare/notion-ai-vs-clickup` and `/compare/canva-vs-adobe-express`, but no such pages exist under `app/compare/` — those links 404 in production. Recommend either building those pages or removing the links.
- Third-party affiliate directories still advertise Descript at "15% recurring" — that's stale; the official terms changed to $25 flat. Don't rely on directory data for any program.
- Podcastle has rebranded to "Async" (podcastle.ai now redirects to async.com) — worth knowing if you ever target it.
