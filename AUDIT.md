# Repository audit & upgrade summary — fikraInAction

Date: 2026-07-31  
Firebase project preserved: `fikra-e47d9`  
`.openai/hosting.json` project id preserved.

## Starting point

English affiliate content platform (Next.js 16 + Firebase App Hosting) with:

- Admin studio (landing pages, products, HTML blog, media, analytics)
- `/go/{slug}` affiliate redirects
- Static tools/comparisons/legal pages
- Deny-all Firestore/Storage client rules

## Gap closed in this upgrade

| Area | Status |
|---|---|
| Bilingual routes `/ar` `/en` + RTL/LTR | Implemented |
| Brand `fikraInAction`, fonts Cairo/Inter/JetBrains Mono, navy `#001329` | Implemented |
| TipTap editor component + TipTap→HTML renderer | Implemented (`RichTextEditor`, `render-tiptap`) |
| Code languages + Prettier formatter + Shiki `CodeBlock` | Implemented |
| Posts/postLocales model + legacy `blogPosts` fallback | Implemented |
| Migration + seed scripts (dry-run, idempotent) | Implemented |
| Roles + `set-user-role` + authz helper | Implemented |
| Comments / contact / newsletter APIs | Implemented |
| Cookie consent gating analytics | Implemented |
| SEO hreflang, sitemap locales, RSS | Implemented |
| Cloud Functions (comments, schedule publish, affiliate) | Implemented |
| Docs (README, FIREBASE_SETUP, DEPLOYMENT, MIGRATION, CMS, DATA_MODEL, SECURITY) | Implemented |
| Production `next build` | Passing |
| Automated tests (18) | Passing |

## Retained

- Existing admin studio AI landing-page generator
- `/go/*`, `/tools/*`, `/reviews/*`, `/compare/*`, `/admin`
- Legacy Firestore collections and deny-all rules
- Bootstrap admin email `goldensparkbh@gmail.com`
- ChatGPT Sites / vinext dual-build path

## Intentionally deferred / next steps

1. **Deep AdminStudio rewrite** — TipTap is available as `app/components/RichTextEditor.tsx` but the legacy HTML blog textarea remains; wire TipTap + autosave/revisions UI into the studio next.
2. **Full CMS modules UI** — menus/homepage/comments moderation/users screens need dedicated admin panels beyond API + defaults.
3. **Playwright e2e + emulator rules suite** — unit/config tests exist; expand with emulator-backed rules tests and browser e2e.
4. **Production migration** — run `npm run migrate:dry-run` then `npm run migrate` only after Firestore export backup (see MIGRATION.md). Not executed against production from this session.
5. **App Check enforcement** — document/configure in Console before exposing public write functions widely.
6. **Legal copy** — starter templates require lawyer review and business/jurisdiction details.

## Verification run locally

```text
npm test          → 18 passed
npm run typecheck → clean
npm run build:next → success (locale routes + legacy routes)
functions build   → success
```

## Required user actions before production cutover

1. `gcloud auth application-default login` (or service account) for migrate/seed/role scripts.
2. Backup Firestore, then migrate dry-run → migrate.
3. `npm run firebase:set-role -- goldensparkbh@gmail.com owner`
4. Deploy rules, indexes, functions, App Hosting.
5. Confirm `NEXT_PUBLIC_SITE_URL=https://fikrainaction.com`.
6. Complete legal page business details in CMS.
