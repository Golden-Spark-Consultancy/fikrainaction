/** Legacy affiliate analytics API — retired from blog CMS admin. */
export async function GET() {
  return Response.json(
    {
      error: "Affiliate analytics has been removed from the blog CMS admin.",
      code: "LEGACY_FEATURE_REMOVED",
    },
    { status: 410 },
  );
}
