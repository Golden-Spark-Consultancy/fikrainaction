# Google Ads plan — Semrush comparison page

**You launch this yourself.** Everything below is prepared; nothing has been created in any ad account. I can walk you through the Google Ads UI step by step when you're ready.

## Prerequisites (do first)

1. Set `products/semrush` in Firestore: `affiliateUrl` = your Impact tracking link (`https://semrush.sjv.io/c/...`), `subIdParam` = `subId1`. Test by visiting `https://fikrainaction.com/go/semrush?campaign=test` and confirming you land on semrush.com via your tracking link.
2. Confirm your Semrush partnership in Impact is active.

## Campaign settings

- **Type:** Search only (uncheck Display Network and Search Partners).
- **Final URL (all ads):** `https://fikrainaction.com/compare/semrush-vs-ahrefs-vs-ubersuggest` — Google appends `gclid` automatically; the page's `AffiliateCta` carries it into `/go/semrush`, which forwards it to Impact as `subId1=g_<gclid>`.
- **Bidding:** Maximize Clicks with a **max CPC limit of $4** to start. Switch to Maximize Conversions only after ≥30 tracked conversions.
- **Daily budget:** **$20/day** (your chosen $15–25 band). Hard monthly ceiling ≈ $600.
- **Geo:** United States, United Kingdom, Canada, Australia, Ireland, New Zealand. "Presence: people in or regularly in" (not "interest in").
- **Language:** English.
- **Compliance guardrails:** No Semrush brand terms anywhere (keywords **or** ad copy) — the program bans brand bidding including misspellings, and this also avoids Google trademark disapprovals. No direct linking (ads land on our page — required by the program).

## Ad group 1 — Alternative-seeking intent (highest value)

Keywords (phrase match unless noted):

- "ahrefs alternative", "ahrefs alternatives"
- "ahrefs alternative cheaper"
- "moz alternative", "moz pro alternative"
- "ubersuggest alternative"
- [alternatives to ahrefs] (exact)

## Ad group 2 — Category / comparison intent

- "best seo tools 2026"
- "best seo software for small business"
- "best seo tool for agencies"
- "seo tools comparison"
- "all in one seo platform"
- "best keyword research tool"
- "competitor analysis tool seo"
- "rank tracking software"

## Negative keywords (campaign level)

`semrush`, `sem rush`, `semrash`, `smerush` (brand-bidding compliance — guarantees close variants never match brand queries), plus: `free`, `crack`, `cracked`, `group buy`, `login`, `tutorial`, `course`, `certification`, `academy`, `api`, `jobs`, `career`, `salary`, `what is`, `definition`, `youtube`, `reddit`, `vs excel`.

## Responsive search ads (2 per ad group)

No brand names in copy (trademark policy + program compliance).

**RSA A — comparison angle**
- Headlines: "Best SEO Tools Compared 2026" · "Which SEO Platform Fits You?" · "Honest SEO Tool Comparison" · "Pricing, Data & Trade-Offs" · "Independent Review Site" · "Find Your SEO Toolkit" · "SEO Tools Side by Side" · "Free Trials Compared"
- Descriptions: "See how the leading SEO platforms compare on price, keyword data, and day-to-day workflow." · "An independent comparison built for marketers who want to decide fast — includes free-trial options." · "We compare the tools honestly, including where each one is the wrong choice." · "Affiliate-supported, clearly disclosed, never pay-to-rank."

**RSA B — switching angle (ad group 1 emphasis)**
- Headlines: "Looking For An Alternative?" · "Compare Top SEO Platforms" · "Better Fit For Your Budget?" · "SEO Tools: Real Trade-Offs" · "Switch With Confidence" · "See The Side-by-Side" · "Which Tool Wins For You?" · "Updated July 2026"
- Descriptions: "Thinking of switching SEO tools? See the honest side-by-side before you commit." · "Compare pricing, keyword databases, backlink data, and free trials in one place." · "Written by marketers, updated July 2026, with clear affiliate disclosure." · "Pick the platform that fits your workflow — not the loudest ad."

## Auto-pause plan (check every 2–3 days)

- Any keyword with **>$25 spend and zero `/go/semrush` clicks** → pause keyword.
- Campaign at **$150 cumulative spend with zero Impact trial activations** → pause campaign, review search-terms report and landing page.
- Search-terms report: add any brand-ish or irrelevant queries as negatives each check.
- CPC creeping above $4 average → lower max CPC or tighten to exact match.

## Break-even math (estimates — validate CPCs in Keyword Planner before launch)

At $20/day and an estimated $2.50–4 CPC: ~5–8 clicks/day. Payout $200/sale + $10/trial (verified 18 Jul 2026). Break-even ≈ 1 sale per ~65–80 clicks (~2 weeks of spend) *before* counting $10 trial bonuses; each 1% of clicks that starts a trial adds ~$0.10/click EPC. If after ~500 clicks there are no sales and <2% trial rate, the funnel isn't working — stop and rework rather than raising budget.

## Weekly reconciliation

1. Google Ads: export campaign/keyword spend + clicks.
2. Firestore `affiliateClicks`: filter `productSlug == "semrush"`, group by `campaign`/`gclid`.
3. Impact: Reports → filter by SubId1 (`g_<gclid>`) → trials + sales.
4. Join on gclid → spend, clicks, CPC, trials, sales, EPC, ROI per campaign. Conversions are only what Impact reports — never inferred.

Ask me for this report anytime — if you export the three CSVs (or connect the dashboards), I'll produce it.
