# AI landing-page setup

The administration studio accepts a single official or affiliate platform URL. It researches the public site, writes a structured long-form draft with Gemini, creates original editorial illustrations in Firebase Storage, and finds embeddable tutorials through the YouTube Data API.

## Gemini through Vertex AI

Production uses the Firebase App Hosting runtime service account by default:

1. Enable the Vertex AI API in the Google Cloud project connected to Firebase App Hosting.
2. Grant the App Hosting runtime service account the **Vertex AI User** role.
3. The default models are `gemini-2.5-flash` for writing and `gemini-2.5-flash-image` for illustrations.

Optional runtime variables:

- `VERTEX_AI_LOCATION` — defaults to `us-central1`.
- `GEMINI_TEXT_MODEL` — overrides the text model.
- `GEMINI_IMAGE_MODEL` — overrides the image model.
- `GEMINI_API_KEY` — uses the Gemini Developer API instead of Vertex AI. Store it as an App Hosting secret and never expose it with a `NEXT_PUBLIC_` prefix.

## YouTube videos

1. Enable YouTube Data API v3.
2. Create an API key restricted to YouTube Data API v3.
3. Add it to the App Hosting runtime environment as `YOUTUBE_API_KEY`.

If the YouTube key is absent or exhausted, the article still generates and adds an editorial warning instead of inserting unverified video IDs.

## Editorial workflow

- The submitted URL remains the call-to-action destination.
- Generated pages are drafts until an administrator reviews and publishes them.
- Official sources and the research date are included in each draft.
- Time-sensitive pricing and commercial claims must be checked before publishing.
- AI-generated illustrations are labeled separately from official-site images and screenshots.
