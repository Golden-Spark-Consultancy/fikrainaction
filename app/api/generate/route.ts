/** Legacy AI landing-page generator — retired from the blog CMS admin. */
export async function POST() {
  return Response.json(
    {
      error:
        "The legacy AI landing-page generator has been removed. Use Bulk AI Blog Generator in the CMS admin to create draft posts.",
      code: "LEGACY_FEATURE_REMOVED",
      replacement: "/admin → Bulk AI Blog Generator",
    },
    { status: 410 },
  );
}

export async function GET() {
  return POST();
}
