import { notFound } from "next/navigation";
import { tools } from "../../../../lib/data";
import { isLocale, type Locale } from "../../../../lib/i18n/config";
import { createTranslator } from "../../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../../lib/seo/metadata";
import AffiliateCta from "../../../components/AffiliateCta";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) return {};
  const tool = tools.find((item) => item.slug === slug);
  if (!tool) return {};
  return buildPageMetadata({
    locale: raw,
    title: tool.name,
    description: tool.description,
    path: `/tools/${slug}`,
  });
}

export default async function ToolPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);
  const tool = tools.find((item) => item.slug === slug);
  if (!tool) notFound();

  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{tool.name}</h1>
      <p className="affiliate-notice">{t("common.affiliateDisclosure")}</p>
      <p>{tool.description}</p>
      <ul>
        {tool.highlights.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <AffiliateCta slug={tool.slug} campaign="tool-review" position="footer">
        {locale === "ar" ? "جرّب الأداة" : "Try this tool"}
      </AffiliateCta>
    </main>
  );
}
