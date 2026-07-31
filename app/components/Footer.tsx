import Image from "next/image";
import Link from "next/link";
import { localizedPath, type Locale } from "../../lib/i18n/config";
import { createTranslator } from "../../lib/i18n/translate";
import type { MenuDoc } from "../../lib/types/cms";

export function Footer({ locale, menu }: { locale: Locale; menu?: MenuDoc }) {
  const t = createTranslator(locale);
  const year = new Date().getFullYear();
  const items = (menu?.items ?? []).filter((item) => item.enabled);

  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Link
            className="footer-logo-link"
            href={localizedPath(locale)}
            aria-label="fikraInAction home"
          >
            <Image
              className="footer-logo"
              src="/fikra-in-action-logo.png"
              alt="fikraInAction"
              width={1170}
              height={607}
              unoptimized
            />
          </Link>
          <p>{t("tagline")}</p>
        </div>
        <div>
          <strong>{t("nav.categories")}</strong>
          <Link href={localizedPath(locale, "/category/artificial-intelligence")}>
            {t("nav.ai")}
          </Link>
          <Link href={localizedPath(locale, "/category/programming")}>
            {t("nav.programming")}
          </Link>
          <Link href={localizedPath(locale, "/category/hardware")}>
            {t("nav.hardware")}
          </Link>
          <Link href={localizedPath(locale, "/blog")}>{t("nav.blog")}</Link>
        </div>
        <div>
          <strong>{t("nav.about")}</strong>
          <Link href={localizedPath(locale, "/about")}>{t("nav.about")}</Link>
          <Link href={localizedPath(locale, "/contact")}>{t("nav.contact")}</Link>
          <Link href={localizedPath(locale, "/tools")}>{t("nav.tools")}</Link>
        </div>
        <div>
          <strong>{t("common.footer.privacy")}</strong>
          {items.map((item) => (
            <Link
              key={item.id}
              href={localizedPath(locale, item.href || "/")}
            >
              {item.label[locale] || item.label.en || item.id}
            </Link>
          ))}
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {year} fikraInAction — {t("common.footer.rights")}
        </span>
        <span>{t("common.affiliateDisclosure")}</span>
      </div>
    </footer>
  );
}
