# fikraInAction

Bilingual (Arabic / English) technology publication and CMS built on Next.js and Firebase.

**Brand name:** `fikraInAction` (do not translate or change capitalization)

## Stack

- Next.js App Router + React + TypeScript
- Tailwind CSS
- Firebase Authentication, Firestore, Storage, App Hosting
- Cloud Functions for scheduled publishing and secured comment flows
- TipTap rich editor, Shiki highlighting, Prettier-based code formatting
- Cookie-consent-gated analytics

Configured Firebase project: `fikra-e47d9`

## Quick start

```bash
npm install
cp .env.example .env.local
# Fill Firebase web config values (or rely on next.config fallbacks for local UI work)
npm run firebase:emulators
npm run dev
```

Open http://localhost:3000 — middleware sends `/` to `/ar` by default (or `/en` when `NEXT_LOCALE=en`).

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Next.js development server |
| `npm run build:next` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm test` | Unit / config tests |
| `npm run migrate:dry-run` | Preview blogPosts → posts/postLocales migration |
| `npm run migrate` | Apply migration (does not delete legacy docs) |
| `npm run seed:dry-run` / `npm run seed` | Safe demo seed (skips existing data) |
| `npm run firebase:emulators` | Auth, Firestore, Storage, Functions emulators |
| `npm run firebase:set-role -- user@example.com owner` | Assign CMS role custom claims |
| `npm run firebase:deploy:rules` | Deploy Firestore/Storage rules + indexes |
| `npm run firebase:deploy:functions` | Build and deploy Cloud Functions |

## Documentation

- [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [MIGRATION.md](./MIGRATION.md)
- [CMS_USER_GUIDE.md](./CMS_USER_GUIDE.md)
- [DATA_MODEL.md](./DATA_MODEL.md)
- [SECURITY.md](./SECURITY.md)

## Locales

- `/ar/...` — Arabic, `dir=rtl`, Cairo
- `/en/...` — English, `dir=ltr`, Inter
- `/go/{slug}` — affiliate redirects (unprefixed, preserved)
- `/admin` — CMS (unprefixed)

Legacy unprefixed public URLs permanently redirect to the matching locale path.
