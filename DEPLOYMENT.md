# Deployment — fikraInAction

## Firebase App Hosting (primary)

1. Push to `main` on the connected repository (`Golden-Spark-Consultancy/fikrainaction`).
2. App Hosting builds with `npm run build` / `build:next` when `FIREBASE_CONFIG` is present.
3. Confirm rollout in Firebase Console → App Hosting.

### Environment

Provided automatically by App Hosting:

- `FIREBASE_CONFIG`
- `FIREBASE_WEBAPP_CONFIG`

Set explicitly (see `apphosting.yaml`):

- `FIREBASE_ADMIN_EMAILS`
- `NEXT_PUBLIC_FIREBASE_ADMIN_EMAIL`
- `GEMINI_API_KEY` (secret)
- `YOUTUBE_API_KEY` (secret)
- `NEXT_PUBLIC_SITE_URL` (recommended)

## Rules and indexes

```bash
npm run firebase:deploy:rules
```

## Cloud Functions

```bash
npm run firebase:deploy:functions
```

## Pre-deploy verification

```bash
npm run typecheck
npm run lint
npm test
npm run build:next
```

## Rollback

1. App Hosting → previous rollout → redeploy.
2. Rules: redeploy previous git revision of `firestore.rules` / `storage.rules`.
3. Data: restore from Firestore export (see MIGRATION.md). Never rely on undelete for production recovery.
