import { listPublishedPosts } from "../../../lib/cms/posts";
import { isLocale, SITE_URL, type Locale } from "../../../lib/i18n/config";
import type { PostLocale } from "../../../lib/types/cms";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string }> },
) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return new Response("Not found", { status: 404 });
  const locale = raw as Locale;
  const posts = await listPublishedPosts(locale, { limit: 50 }).catch(() => [] as PostLocale[]);

  const items = posts
    .map(
      (post: PostLocale) => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${SITE_URL}/${locale}/blog/${post.slug}</link>
      <guid>${SITE_URL}/${locale}/blog/${post.slug}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      ${post.publishedAt ? `<pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>` : ""}
    </item>`,
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>fikraInAction (${locale})</title>
    <link>${SITE_URL}/${locale}</link>
    <description>Technology articles from fikraInAction</description>
    <language>${locale}</language>
    ${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=600",
    },
  });
}
