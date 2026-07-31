/** Legacy products catalogue API — retired from blog CMS admin. */
export async function GET() {
  return Response.json(
    {
      error: "Products administration has been removed from the blog CMS.",
      code: "LEGACY_FEATURE_REMOVED",
      products: [],
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}
