import { isLocale, type Locale } from "../i18n/config";
import { createTranslator } from "../i18n/translate";
import { buildPageMetadata } from "../seo/metadata";

const LEGAL: Record<
  string,
  {
    titleKey: string;
    /** Starter content — requires legal review before treating as formal advice. */
    body: Record<Locale, string[]>;
  }
> = {
  privacy: {
    titleKey: "common.footer.privacy",
    body: {
      ar: [
        "توضح سياسة الخصوصية هذه كيفية تعامل fikraInAction مع البيانات. التفاصيل التجارية والولاية القضائية ومزودو التحليلات تتطلب مراجعة قانونية قبل الاعتماد الرسمي.",
        "نجمع الحد الأدنى من البيانات اللازمة لتشغيل الموقع، بما في ذلك تفضيلات ملفات تعريف الارتباط ورسائل التواصل واشتراكات النشرة عند تقديمها طوعاً.",
        "لا نبيع البيانات الشخصية. تُعالج بيانات التعليقات الخاصة بشكل منفصل عن المحتوى العلني.",
      ],
      en: [
        "This Privacy Policy explains how fikraInAction handles data. Business details, jurisdiction, and analytics vendors require legal review before formal reliance.",
        "We collect the minimum data needed to operate the site, including cookie preferences, contact messages, and newsletter subscriptions when voluntarily provided.",
        "We do not sell personal data. Private commenter details are stored separately from public comment content.",
      ],
    },
  },
  terms: {
    titleKey: "common.footer.terms",
    body: {
      ar: [
        "باستخدام موقع fikraInAction فإنك توافق على هذه الشروط. المحتوى لأغراض معلوماتية ولا يُعد استشارة مهنية.",
        "قد تتغير الأسعار والميزات لدى الأطراف الثالثة دون إشعار. تحقق دائماً من المصدر الرسمي قبل الشراء.",
        "يُرجى استكمال بيانات الجهة المالكة والولاية القضائية عبر لوحة التحكم قبل النشر النهائي.",
      ],
      en: [
        "By using fikraInAction you agree to these terms. Content is informational and is not professional advice.",
        "Third-party prices and features may change without notice. Always verify official sources before purchase.",
        "Complete owner identity and jurisdiction details in the CMS before treating this as final legal copy.",
      ],
    },
  },
  cookies: {
    titleKey: "common.footer.cookies",
    body: {
      ar: [
        "نستخدم ملفات ضرورية لتشغيل الموقع. ملفات التحليلات والتسويق تُحمَّل فقط بعد موافقتك عبر بانر الموافقة.",
        "يمكنك تغيير تفضيلاتك في أي وقت من زر تخصيص ملفات تعريف الارتباط.",
      ],
      en: [
        "We use necessary cookies to run the site. Analytics and marketing cookies load only after you consent via the cookie banner.",
        "You can change preferences at any time from the cookie preferences control.",
      ],
    },
  },
  "affiliate-disclosure": {
    titleKey: "common.footer.affiliate",
    body: {
      ar: [
        "قد يحتوي fikraInAction على روابط شركاء. قد نحصل على عمولة إذا اشتريت عبر تلك الروابط دون زيادة التكلفة عليك.",
        "آراؤنا تحريرية ومستقلة. لا نختلق شراكات أو خصومات أو ادعاءات منتجات غير مدخلة من الإدارة.",
        "روابط الشراكة تستخدم rel=\"sponsored nofollow noopener\".",
      ],
      en: [
        "fikraInAction may include affiliate links. We may earn a commission if you buy through those links at no extra cost to you.",
        "Our opinions remain editorial and independent. We do not invent partnerships, discounts, or product claims not entered by administrators.",
        "Affiliate links use rel=\"sponsored nofollow noopener\".",
      ],
    },
  },
  "editorial-policy": {
    titleKey: "common.footer.editorial",
    body: {
      ar: [
        "نهدف إلى تقديم محتوى تقني عملي ودقيق. نحدّث المقالات عند تغير المنتجات أو أفضل الممارسات.",
        "نفصل بين التغطية التحريرية والترويج المدفوع عند وجوده.",
      ],
      en: [
        "We aim to publish practical, accurate technology content. Articles are updated when products or best practices change.",
        "We separate editorial coverage from paid promotion when applicable.",
      ],
    },
  },
  "comment-policy": {
    titleKey: "common.footer.commentPolicy",
    body: {
      ar: [
        "نرحب بالنقاش المحترم. يُرفض المحتوى المسيء أو المزعج أو الذي يحتوي روابط مفرطة.",
        "قد تخضع التعليقات للمراجعة قبل النشر. البريد الإلكتروني لا يُعرض علناً.",
      ],
      en: [
        "Respectful discussion is welcome. Abusive, spammy, or link-heavy comments may be rejected.",
        "Comments may be moderated before publication. Email addresses are never shown publicly.",
      ],
    },
  },
  accessibility: {
    titleKey: "common.footer.accessibility",
    body: {
      ar: [
        "نسعى للتوافق مع WCAG 2.2 AA قدر الإمكان، بما في ذلك التنقل بلوحة المفاتيح وحالات التركيز الواضحة ودعم RTL/LTR.",
        "إذا واجهت عائقاً في الوصول، تواصل معنا عبر صفحة الاتصال.",
      ],
      en: [
        "We aim to meet WCAG 2.2 AA as closely as practical, including keyboard navigation, visible focus, and RTL/LTR support.",
        "If you encounter an accessibility barrier, contact us via the contact page.",
      ],
    },
  },
  about: {
    titleKey: "nav.about",
    body: {
      ar: [
        "fikraInAction منصة تقنية ثنائية اللغة تغطي الذكاء الاصطناعي والبرمجة والأجهزة وإنترنت الأشياء والشروحات والمراجعات.",
        "نساعد القراء على الانتقال من الفكرة إلى التنفيذ بمحتوى واضح وقابل للتطبيق.",
      ],
      en: [
        "fikraInAction is a bilingual technology publication covering AI, programming, hardware, IoT, tutorials, and reviews.",
        "We help readers move from idea to action with clear, practical content.",
      ],
    },
  },
};

export type LegalSlug = keyof typeof LEGAL;

export function LegalPage(slug: LegalSlug) {
  return async function Page({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale: raw } = await params;
    if (!isLocale(raw)) {
      return null;
    }
    const locale = raw as Locale;
    const t = createTranslator(locale);
    const entry = LEGAL[slug];
    return (
      <main id="main-content" className="content-hero">
        <div className="narrow">
          <p className="micro-label">fikraInAction</p>
          <h1>{t(entry.titleKey)}</h1>
          <p className="content-intro">
            {locale === "ar"
              ? "هذا نص تمهيدي قابل للتحرير عبر نظام الإدارة ويتطلب مراجعة قانونية."
              : "Starter template editable in the CMS. Legal review required before formal use."}
          </p>
        </div>
        <div className="container policy-layout">
          <article className="policy-content">
            {entry.body[locale].map((paragraph) => (
              <section className="policy-section" key={paragraph.slice(0, 24)}>
                <p>{paragraph}</p>
              </section>
            ))}
          </article>
        </div>
      </main>
    );
  };
}

export function legalMetadata(slug: LegalSlug) {
  return async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }) {
    const { locale: raw } = await params;
    if (!isLocale(raw)) return {};
    const t = createTranslator(raw);
    const entry = LEGAL[slug];
    return buildPageMetadata({
      locale: raw,
      title: t(entry.titleKey),
      description: entry.body[raw][0],
      path: `/${slug}`,
    });
  };
}
