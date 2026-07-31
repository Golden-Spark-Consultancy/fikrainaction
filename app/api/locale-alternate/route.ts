import { isLocale, type Locale } from "../../../lib/i18n/config";
import { resolveAlternateBlogSlug } from "../../../lib/cms/posts";
import { getFirebaseServiceIssue } from "../../../lib/firebase/service-errors";

/**
 * Public helper for the language switcher: given a blog slug in one locale,
 * return the sibling locale's slug (same postId, linked AR/EN pair).
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const localeRaw = url.searchParams.get("locale") || "";
    const slug = (url.searchParams.get("slug") || "").trim();
    if (!isLocale(localeRaw) || !slug) {
      return Response.json({ error: "locale and slug are required." }, { status: 400 });
    }

    const locale = localeRaw as Locale;
    const alternate = await resolveAlternateBlogSlug(locale, slug, {
      requirePublished: true,
    });

    if (!alternate) {
      return Response.json({ found: false });
    }

    return Response.json({
      found: true,
      postId: alternate.postId,
      locale: alternate.otherLocale,
      slug: alternate.slug,
      path: `/blog/${alternate.slug}`,
    });
  } catch (error) {
    const serviceIssue = getFirebaseServiceIssue(error);
    if (serviceIssue) return Response.json(serviceIssue, { status: 503 });
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to resolve alternate locale." },
      { status: 500 },
    );
  }
}
