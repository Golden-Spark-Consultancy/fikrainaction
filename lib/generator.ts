import type { AiLandingDraft } from "./ai-generator";
import type { PlatformResearch } from "./platform-research";
import type { GeneratedVideo } from "./youtube";

export type GenerationInput = { platformUrl: string };

export type GeneratedImage = {
  url: string;
  alt: string;
  sourceLabel: string;
  sourceUrl: string;
  role: "hero" | "screenshot" | "logo" | "illustration";
  origin?: "official" | "generated";
};

export type GeneratedPage = {
  title: string;
  slug: string;
  pageType: string;
  seo: { title: string; description: string; keywords: string[] };
  hero: { headline: string; subheadline: string; primaryCta: { text: string; url: string } };
  product: AiLandingDraft["product"];
  sections: { id: string; type: string; heading: string; content: string }[];
  images: GeneratedImage[];
  videos: GeneratedVideo[];
  sources: Array<{ title: string; url: string }>;
  lastCheckedAt: string;
  html: string;
  affiliateDisclosure: string;
  warnings: string[];
};

const escapeHtml = (value: string) => String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
export const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `page-${Date.now()}`;

function paragraphs(values: string[]) {
  return values.map((value) => `<p>${escapeHtml(value)}</p>`).join("");
}

function list(values: string[]) {
  return `<ul>${values.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function imageFigure(image: GeneratedImage, className: string) {
  const caption = image.origin === "generated"
    ? `<figcaption>AI-generated editorial illustration created for Fikra in Action.</figcaption>`
    : `<figcaption>Image source: <a href="${escapeHtml(image.sourceUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(image.sourceLabel)} ↗</a></figcaption>`;
  return `<figure class="generated-media ${className}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" loading="lazy" referrerpolicy="no-referrer" />${caption}</figure>`;
}

function videoSection(name: string, videos: GeneratedVideo[]) {
  if (!videos.length) return "";
  return `<section class="generated-video-section"><p class="generated-kicker">Watch and learn</p><h2>See ${escapeHtml(name)} in action</h2><p>These independently published YouTube videos were selected automatically for relevance. Confirm each video is current and suitable before publishing.</p><div class="generated-video-grid">${videos.map((video) => `<article><div class="generated-video-frame"><iframe src="${escapeHtml(video.embedUrl)}" title="${escapeHtml(video.title)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><a href="${escapeHtml(video.url)}" target="_blank" rel="nofollow noopener"><strong>${escapeHtml(video.title)}</strong><span>${escapeHtml(video.channel)} · Watch on YouTube ↗</span></a></article>`).join("")}</div></section>`;
}

function pricingSection(draft: AiLandingDraft, checked: string) {
  const plans = draft.product.plans || [];
  const cards = plans.length ? `<div class="generated-pricing-grid">${plans.map((plan) => `<article><p class="generated-kicker">${escapeHtml(plan.billing || "Current plan")}</p><h3>${escapeHtml(plan.name)}</h3><strong>${escapeHtml(plan.price || "Check current price")}</strong><p>${escapeHtml(plan.bestFor)}</p>${list(plan.features || [])}</article>`).join("")}</div>` : "";
  return `<section><p class="generated-kicker">Pricing checked ${escapeHtml(checked)}</p><h2>Plans and pricing</h2><p>${escapeHtml(draft.product.pricing)}</p>${cards}<p class="generated-fact-note">Prices, limits, currencies, and promotions can change. Confirm the final amount and billing terms on the platform before subscribing.</p><p>${escapeHtml(draft.article.pricingAdvice)}</p></section>`;
}

export function generateStructuredPage(draft: AiLandingDraft, images: GeneratedImage[], videos: GeneratedVideo[], research: PlatformResearch, extraWarnings: string[] = []): GeneratedPage {
  const { product, article } = draft;
  const safeName = escapeHtml(product.name);
  const checked = new Date(research.researchedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  const disclosure = "Fikra in Action may earn a commission when you purchase or register through links on this page. This does not affect the price you pay and does not influence our editorial evaluation.";
  const heroImage = images.find((image) => image.origin === "generated" && image.role === "hero") || images.find((image) => image.role === "hero") || images[0];
  const supportingImages = images.filter((image) => image.url !== heroImage?.url).slice(0, 2);
  const featureHtml = `<div class="generated-feature-grid">${article.featureDetails.map((feature, index) => `<article><span>${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(feature.title)}</h3><p>${escapeHtml(feature.description)}</p></article>`).join("")}</div>`;
  const useCaseHtml = `<div class="generated-usecase-grid">${article.useCases.map((useCase) => `<article><h3>${escapeHtml(useCase.title)}</h3><p>${escapeHtml(useCase.description)}</p></article>`).join("")}</div>`;
  const faqHtml = article.faqs.map((faq) => `<details><summary>${escapeHtml(faq.question)}</summary><p>${escapeHtml(faq.answer)}</p></details>`).join("");
  const alternativesHtml = article.alternatives.length ? `<div class="generated-alternatives">${article.alternatives.map((alternative) => `<article><h3>${escapeHtml(alternative.name)}</h3><p>${escapeHtml(alternative.bestWhen)}</p></article>`).join("")}</div>` : "<p>No specific alternative was supported by the researched evidence. Add verified alternatives during editorial review.</p>";
  const officialScreenshot = supportingImages.find((image) => image.origin === "official" && image.role === "screenshot");
  const editorialImage = supportingImages.find((image) => image.origin === "generated") || supportingImages.find((image) => image.url !== officialScreenshot?.url);
  const sourceHtml = research.sources.map((source) => `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="nofollow noopener">${escapeHtml(source.title)} ↗</a></li>`).join("");

  const html = `<article class="generated-article">
    <section class="generated-hero"><div><p class="generated-kicker">${escapeHtml(article.kicker)} · Researched ${escapeHtml(checked)}</p><h1>${escapeHtml(article.headline)}</h1><p>${escapeHtml(article.subheadline)}</p><a class="generated-cta" href="${escapeHtml(product.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">Explore ${safeName} ↗</a></div>${heroImage ? imageFigure(heroImage, "generated-hero-media") : ""}</section>
    <aside class="generated-disclosure"><strong>Affiliate disclosure:</strong> ${disclosure}</aside>
    <section class="generated-summary"><p class="generated-kicker">Quick verdict</p><h2>Is ${safeName} worth considering?</h2><p>${escapeHtml(article.quickVerdict)}</p></section>
    <section><h2>What is ${safeName}?</h2>${paragraphs(article.introduction)}<p>${escapeHtml(article.whatItIs)}</p></section>
    <section><h2>How ${safeName} works</h2><p>${escapeHtml(article.howItWorks)}</p>${officialScreenshot ? imageFigure(officialScreenshot, "generated-supporting-media") : ""}</section>
    <section><p class="generated-kicker">Capabilities</p><h2>Key features explained</h2>${featureHtml}</section>
    ${editorialImage ? `<section class="generated-visual-section"><h2>A practical view of the workflow</h2>${imageFigure(editorialImage, "generated-supporting-media")}</section>` : ""}
    <section><h2>Practical use cases</h2>${useCaseHtml}</section>
    <section><h2>Who should use ${safeName}?</h2><div class="generated-columns"><div><h3>Best for</h3>${list(article.bestFor)}</div><div><h3>May not suit</h3>${list(article.notFor)}</div></div></section>
    <section><h2>Advantages and limitations</h2><div class="generated-columns"><div><h3>Potential advantages</h3>${list(article.pros)}</div><div><h3>Limitations to consider</h3>${list(article.cons)}</div></div></section>
    ${pricingSection(draft, checked)}
    ${videoSection(product.name, videos)}
    <section><h2>Privacy, security, and responsible use</h2><p>${escapeHtml(article.privacySecurity)}</p><p class="generated-fact-note">Review the vendor's current privacy policy, data-processing terms, retention settings, and regional availability for your own compliance needs.</p></section>
    <section><h2>Alternatives worth comparing</h2>${alternativesHtml}</section>
    <section><h2>Frequently asked questions</h2>${faqHtml}</section>
    <section class="generated-final"><p class="generated-kicker">The practical conclusion</p><h2>Final verdict on ${safeName}</h2><p>${escapeHtml(article.finalVerdict)}</p><a class="generated-cta" href="${escapeHtml(product.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">Visit ${safeName} ↗</a><small>Affiliate link — we may earn a commission at no extra cost to you.</small></section>
    <section class="generated-sources"><h2>Official sources reviewed</h2><p>Research completed ${escapeHtml(checked)}. Recheck time-sensitive claims before publishing.</p><ol>${sourceHtml}</ol></section>
  </article>`;

  const sections = [
    { id: crypto.randomUUID(), type: "summary", heading: "Quick verdict", content: article.quickVerdict },
    { id: crypto.randomUUID(), type: "introduction", heading: `What is ${product.name}?`, content: article.introduction.join("\n\n") },
    { id: crypto.randomUUID(), type: "features", heading: "Key features explained", content: article.featureDetails.map((item) => `${item.title}: ${item.description}`).join("\n") },
    { id: crypto.randomUUID(), type: "pricing", heading: "Plans and pricing", content: `${product.pricing}\n${article.pricingAdvice}` },
    { id: crypto.randomUUID(), type: "pros-cons", heading: "Advantages and limitations", content: `Pros:\n${article.pros.join("\n")}\n\nCons:\n${article.cons.join("\n")}` },
    { id: crypto.randomUUID(), type: "faq", heading: "Frequently asked questions", content: article.faqs.map((item) => `${item.question}\n${item.answer}`).join("\n\n") },
  ];
  const warnings = [
    "AI researched and drafted this page. A human editor must verify every time-sensitive or commercial claim before publishing.",
    `Pricing and product information were checked on ${checked}; confirm them again on the official website.`,
    ...draft.factWarnings,
    ...extraWarnings,
  ].filter(Boolean);
  return {
    title: article.title || `${product.name} Review`, slug: `${slugify(product.name)}-review`, pageType: "Full Product Review",
    seo: { title: article.seoTitle.slice(0, 70), description: article.metaDescription.slice(0, 180), keywords: article.keywords.slice(0, 12) },
    hero: { headline: article.headline, subheadline: article.subheadline, primaryCta: { text: `Explore ${product.name}`, url: product.affiliateUrl } },
    product, sections, images, videos, sources: research.sources.map(({ title, url }) => ({ title, url })), lastCheckedAt: research.researchedAt, html, affiliateDisclosure: disclosure, warnings,
  };
}
