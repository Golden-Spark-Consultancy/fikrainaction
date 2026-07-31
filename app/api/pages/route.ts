/** Legacy landing-pages API — retired from admin. Public /reviews pages may still read Firestore directly. */
export async function GET() {
  return Response.json(
    {
      error: "Landing page administration has been removed from the blog CMS.",
      code: "LEGACY_FEATURE_REMOVED",
      pages: [],
    },
    { status: 410 },
  );
}

export async function POST() {
  return GET();
}

export async function PATCH() {
  return GET();
}

export async function DELETE() {
  return GET();
}
