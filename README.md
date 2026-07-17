# Fikra in Action

Fikra in Action is a full-stack affiliate content platform built with Next.js and prepared for Firebase App Hosting. It uses:

- Firebase App Hosting for the Next.js website and server routes
- Cloud Firestore for landing pages, revisions, products, posts, and affiliate-click records
- Cloud Storage for Firebase for validated page-image and video uploads
- Firebase Authentication with Google sign-in for the administration studio
- Firebase custom claims for administrator authorization

- Configured production project: `fikra-e47d9`
- Configured administrator: `goldensparkbh@gmail.com`
- Deployment repository: `Golden-Spark-Consultancy/fikrainaction`

## Firebase setup

1. In the `fikra-e47d9` Firebase project, enable Cloud Firestore in Native mode.
2. Enable Cloud Storage.
3. Enable Google as a Firebase Authentication provider.
4. Connect `Golden-Spark-Consultancy/fikrainaction` under **Firebase Console → App Hosting → Create backend**.
5. Set the repository root to `/` and production branch to `main`.
6. Deploy the included Firestore and Storage rules:

   ```bash
   npx firebase-tools login
   npx firebase-tools use fikra-e47d9
   npm run firebase:deploy:rules
   ```

Firebase App Hosting supplies `FIREBASE_CONFIG` and `FIREBASE_WEBAPP_CONFIG` automatically. For local development, copy `.env.example` to `.env.local` and add the Web App configuration from Firebase Console.

## Grant the first administrator

`goldensparkbh@gmail.com` is accepted as the initial administrator after signing in through `/admin`. Additional administrators can be granted the custom claim after they have signed in once:

```bash
gcloud auth application-default login
npm run firebase:grant-admin -- administrator@example.com
```

The user must sign out and back in after the claim is added. Firestore, Storage, and the server routes all require the same `admin: true` claim for management operations.

## Data model

- `landingPages/{slug}` — published or draft generated pages
- `landingPages/{slug}/revisions/{revisionId}` — immutable page revisions
- `products/{productId}` — affiliate product catalogue
- `blogPosts/{postId}` — editorial content
- `affiliateClicks/{clickId}` — server-recorded outbound click events
- `mediaAssets/{assetId}` — reusable metadata and download URLs for uploaded files
- `media/{year}/{id}-{filename}` — Storage object path for uploaded media

## Local development

```bash
npm install
cp .env.example .env.local
npm run firebase:emulators
npm run dev
```

For server-side local access, use Application Default Credentials or place a service-account JSON string in the uncommitted `FIREBASE_SERVICE_ACCOUNT_JSON` variable. Never commit service-account credentials.

## Security

All Firestore and Storage operations go through authenticated server routes that verify the Firebase administrator claim. Client access is denied by the included rules, while the Firebase Admin SDK is controlled through IAM. Media uploads are validated as images or videos, limited to 20 MB, stored in Firebase Storage, and indexed in Firestore for reuse in the content studio.

## Deployment files

- `apphosting.yaml` configures the Firebase App Hosting runtime.
- `firebase.json` connects the Firestore indexes/rules, Storage rules, and local emulators.
- `firestore.rules` and `storage.rules` contain the production access policy.
- `.env.example` documents local Firebase Web App variables.

The `.openai/hosting.json` file remains only for the existing ChatGPT Sites preview and contains no production database binding.
