# Data model — fikraInAction

## New collections

| Collection | Purpose |
|---|---|
| `users` | Profiles + role mirror |
| `posts` | Shared article metadata |
| `postLocales` | Per-locale article body/status/SEO |
| `postRevisions` | Immutable snapshots |
| `pages` | Bilingual static pages |
| `categories` / `tags` | Taxonomy with localized names/slugs |
| `comments` | Public comment bodies + moderation status |
| `commentPrivateData` | Email/IP hash (admin only) |
| `media` | Media library metadata (Storage holds bytes) |
| `menus` | Header/footer navigation |
| `homepageSections` | Homepage composition |
| `reusableBlocks` | Reusable editor blocks/CTAs |
| `affiliatePrograms` / `affiliateLinks` | Affiliate management |
| `redirects` | Permanent redirects (e.g. after slug change) |
| `contactSubmissions` | Contact form inbox |
| `newsletterSubscribers` | Newsletter list |
| `siteSettings` | Site-wide settings (`default` doc) |
| `auditLogs` | Append-only audit trail |
| `slugReservations` | Slug uniqueness transactions |

## Legacy collections (retained)

| Collection | Purpose |
|---|---|
| `blogPosts` | Pre-migration editorial HTML posts |
| `landingPages` (+ `revisions`) | AI-generated affiliate landing pages |
| `products` | Affiliate product catalogue |
| `affiliateClicks` | Click analytics |
| `mediaAssets` | Legacy media metadata |

## Storage paths

- `/media/YYYY/MM/...`
- `/thumbnails/`
- `/authors/`
- `/site-assets/`
- `/temporary/`

## Indexes

See `firestore.indexes.json` for composite indexes on `postLocales` and `comments`.
