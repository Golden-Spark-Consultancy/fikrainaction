/**
 * Legacy HTML blogPosts API — retired.
 * Use /api/articles (posts + postLocales TipTap CMS) instead.
 * Existing blogPosts remain readable via lib/cms/posts.ts fallbacks.
 */
export async function GET() {
  return Response.json(
    {
      error:
        "The legacy HTML blog API has been removed. Use the Posts section (/api/articles) for TipTap bilingual posts.",
      code: "LEGACY_FEATURE_REMOVED",
      posts: [],
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
