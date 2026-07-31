# Security — fikraInAction

## Principles

- Client Firestore/Storage access is denied (`allow read, write: if false`).
- Privileged writes use Firebase Admin SDK on authenticated server routes / Cloud Functions.
- UI permission hiding is not sufficient — server and rules enforce authorization.

## Roles (custom claims)

| Role | Notes |
|---|---|
| owner | Full access; manage roles; cannot be removed by another admin |
| administrator | Manage content/settings; cannot demote owner |
| editor | Edit/publish/moderate broadly |
| author | Create/edit own; submit for review |
| moderator | Comments only |

Bootstrap: emails in `FIREBASE_ADMIN_EMAILS` map to owner until claims are assigned.

## Content safety

- TipTap JSON → sanitized HTML (`isomorphic-dompurify` + legacy sanitizer).
- YouTube only via `youtube-nocookie.com` after URL validation.
- No arbitrary script/iframe insertion.
- Affiliate links require `rel="sponsored nofollow noopener"`.

## Public write endpoints

- `/api/comments`, `/api/contact`, `/api/newsletter`
- Rate limited in-process; enable App Check + Cloud Functions for production hardening.
- Honeypot fields ignored silently.

## Secrets

- Never commit service-account JSON.
- `.env.example` lists names only.
- App Hosting secrets for Gemini/YouTube.

## Headers

`next.config.ts` sets CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options`.

## Privacy

- Analytics/marketing scripts load only after cookie consent.
- Comment emails are not public.
- Private comment data is separated from public comments.
