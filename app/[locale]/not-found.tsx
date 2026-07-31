import Link from "next/link";
import { createTranslator } from "../../lib/i18n/translate";
import type { Locale } from "../../lib/i18n/config";

export default function NotFound() {
  const locale: Locale = "ar";
  const t = createTranslator(locale);
  return (
    <main id="main-content" className="container" style={{ paddingBlock: 80, textAlign: "center" }}>
      <p className="micro-label">fikraInAction</p>
      <h1>{t("common.errors.notFoundTitle")}</h1>
      <p>{t("common.errors.notFoundBody")}</p>
      <p>
        <Link href="/ar">{t("common.errors.goHome")} (AR)</Link>
        {" · "}
        <Link href="/en">Home (EN)</Link>
      </p>
    </main>
  );
}
