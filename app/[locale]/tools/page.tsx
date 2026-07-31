import { notFound } from "next/navigation";
import Link from "next/link";
import { tools } from "../../../lib/data";
import {
  isLocale,
  localizedPath,
  type Locale,
} from "../../../lib/i18n/config";
import { createTranslator } from "../../../lib/i18n/translate";
import { buildPageMetadata } from "../../../lib/seo/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) return {};
  const t = createTranslator(raw);
  return buildPageMetadata({
    locale: raw,
    title: t("nav.tools"),
    description: t("home.heroLead"),
    path: "/tools",
  });
}

export default async function ToolsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw as Locale;
  const t = createTranslator(locale);

  return (
    <main id="main-content" className="container" style={{ paddingBlock: 64 }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("nav.tools")}</h1>
      <p className="affiliate-notice">{t("common.affiliateDisclosure")}</p>
      <div className="tool-grid" style={{ marginTop: 32 }}>
        {tools.map((tool) => (
          <article className="tool-card" key={tool.slug}>
            <span className={`logo-tile ${tool.logoClass}`}>{tool.logo}</span>
            <h3>{tool.name}</h3>
            <p>{tool.description}</p>
            <div className="tool-card-foot">
              <Link href={localizedPath(locale, `/tools/${tool.slug}`)}>
                {t("common.readMore")} →
              </Link>
              <a href={`/go/${tool.slug}`} rel="sponsored nofollow noopener">
                {locale === "ar" ? "زيارة الموقع" : "Visit site"}
              </a>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
