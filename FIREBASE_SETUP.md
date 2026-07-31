# Firebase setup — fikraInAction

Project ID: **`fikra-e47d9`** (do not invent a replacement)

## Console checklist

1. Enable **Authentication → Email/Password**.
2. Create the owner account (configured bootstrap: `goldensparkbh@gmail.com`).
3. Enable **Cloud Firestore** (Native mode) if not already created.
4. Enable **Storage**.
5. Enable **App Check** (reCAPTCHA Enterprise or Play Integrity) for production comment/contact endpoints.
6. Connect the GitHub repo under **App Hosting** (root `/`, branch `main`).
7. Add secrets used by `apphosting.yaml`: `GEMINI_API_KEY`, `YOUTUBE_API_KEY`.
8. Deploy rules and indexes:

```bash
npx firebase-tools login
npx firebase-tools use fikra-e47d9
npm run firebase:deploy:rules
```

9. Deploy functions after first build:

```bash
npm run firebase:deploy:functions
```

## First owner

Bootstrap email allowlist still grants owner-level access. To set explicit claims:

```bash
gcloud auth application-default login
npm run firebase:set-role -- goldensparkbh@gmail.com owner
```

User must sign out and back in after claim changes.

## App Check

1. Register the web app in App Check.
2. Enforce App Check on Cloud Functions that accept public writes (`submitComment`).
3. Add the App Check site key to the client when enforcement is enabled.

## Analytics

1. Create a GA4 property (or reuse `G-YHBQM8LF95`).
2. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID`.
3. Analytics scripts load only after cookie consent (`analytics: true`).

## Custom domain

1. Firebase App Hosting → custom domain → `fikrainaction.com`.
2. Set `NEXT_PUBLIC_SITE_URL=https://fikrainaction.com` in App Hosting env.
3. Verify sitemap and hreflang absolute URLs.

## Scheduled publishing

Cloud Function `publishScheduledPosts` runs every 5 minutes and publishes `postLocales` with `status=scheduled` and `scheduledAt <= now`.

Ensure Cloud Scheduler API is enabled for the project when deploying functions.
