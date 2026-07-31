# CMS user guide — fikraInAction

## Sign in

1. Open `/admin`.
2. Sign in with the Firebase email/password account.
3. Roles are enforced via custom claims (`owner`, `administrator`, `editor`, `author`, `moderator`).

## Articles

- Create drafts, submit for review, schedule, or publish.
- Arabic and English versions are independent (title, slug, body, SEO, status, schedule).
- TipTap stores structured JSON; sanitized HTML is generated for public pages.
- Autosave target: ~20 seconds while editing (wire into the studio editor panel).
- Revisions are written to `postRevisions` on save.

## Media

- Upload via the Media panel (validated image/video, max 20 MB).
- Never paste base64 images into Firestore documents.
- Provide Arabic and English alt text when available.

## Comments

- Global enable/disable in site settings.
- Per-article override supported on the post shared document.
- Visitors submit through `/api/comments` (and Cloud Function `submitComment`).
- Emails are stored only in `commentPrivateData` and never rendered publicly.

## Affiliates

- Manage programs and short links in the CMS.
- Public redirects: `/go/{shortCode}` with `rel="sponsored nofollow noopener"` on CTAs.
- Do not invent partnerships, discounts, or claims — enter only real admin data.

## Navigation & homepage

- Header/footer menus and homepage sections are CMS-configurable collections with safe defaults in code when empty.

## Translations

- If a locale is missing, the article page shows a localized unavailable message and links to the available language.
- Never auto-translate article bodies.
