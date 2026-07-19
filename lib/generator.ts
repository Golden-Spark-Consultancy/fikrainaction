export type GenerationInput = {
  name: string;
  type: string;
  category: string;
  description: string;
  officialUrl: string;
  affiliateUrl: string;
  audience: string;
  features: string;
  pricing: string;
  pageType: string;
  tone?: string;
};

export type GeneratedImage = {
  url: string;
  alt: string;
  sourceLabel: string;
  sourceUrl: string;
  role: "hero" | "screenshot" | "logo";
};

export type GeneratedPage = {
  title: string;
  slug: string;
  pageType: string;
  seo: { title: string; description: string; keywords: string[] };
  hero: { headline: string; subheadline: string; primaryCta: { text: string; url: string } };
  sections: { id: string; type: string; heading: string; content: string }[];
  images: GeneratedImage[];
  videos?: { id: string; title: string; channelTitle: string; embedUrl: string }[];
  html: string;
  affiliateDisclosure: string;
  warnings: string[];
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character] ?? character));
export const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || `page-${Date.now()}`;

function imageFigure(image: GeneratedImage, className: string) {
  return `<figure class="generated-media ${className}"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.alt)}" loading="lazy" referrerpolicy="no-referrer" /><figcaption>Image source: <a href="${escapeHtml(image.sourceUrl)}" rel="nofollow noopener" target="_blank">${escapeHtml(image.sourceLabel)} ↗</a></figcaption></figure>`;
}

export function generateStructuredPage(input: GenerationInput, images: GeneratedImage[] = []): GeneratedPage {
  const features = input.features.split(/\n|,/).map((item) => item.trim()).filter(Boolean).slice(0, 8);
  const safeName = escapeHtml(input.name);
  const safeAudience = escapeHtml(input.audience);
  const disclosure = "Fikra in Action may earn a commission when you purchase or register through links on this page. This does not affect the price you pay and does not influence our editorial evaluation.";
  const headline = `${input.name}: a practical guide for ${input.audience}`;
  const sections = [
    { id: crypto.randomUUID(), type: "introduction", heading: `What is ${input.name}?`, content: `${input.description} This page focuses on the practical value, fit, and considerations that matter before making a decision.` },
    { id: crypto.randomUUID(), type: "features", heading: "Key features", content: features.length ? features.join("\n") : "[Add verified product features before publishing.]" },
    { id: crypto.randomUUID(), type: "use-cases", heading: "Who it is best for", content: `${input.name} is positioned for ${input.audience}. Confirm that its workflow, integrations, and regional availability match your requirements.` },
    { id: crypto.randomUUID(), type: "pricing", heading: "Pricing", content: input.pricing || "[Confirm current pricing and plan limitations before publishing.]" },
    { id: crypto.randomUUID(), type: "pros-cons", heading: "Advantages and limitations", content: "Advantages should be based on verified capabilities. Limitations should include plan restrictions, learning curve, and important gaps relevant to the target audience." },
    { id: crypto.randomUUID(), type: "faq", heading: "Frequently asked questions", content: `Is ${input.name} suitable for beginners?\nWhat does it cost?\nWhich alternatives should be considered?` },
  ];
  const featureHtml = features.length ? `<ul>${features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>` : "<p><em>Add verified product features before publishing.</em></p>";
  const heroImage = images.find((image) => image.role === "hero") || images[0];
  const supportingImage = images.find((image) => image.role === "screenshot" && image.url !== heroImage?.url) || images.find((image) => image.url !== heroImage?.url);
  const heroMedia = heroImage ? imageFigure(heroImage, "generated-hero-media") : "";
  const supportingMedia = supportingImage ? `<section class="generated-visual-section"><h2>${safeName} online preview</h2>${imageFigure(supportingImage, "generated-supporting-media")}</section>` : "";
  const html = `<section class="generated-hero"><p class="generated-kicker">${escapeHtml(input.category)} · ${escapeHtml(input.pageType)}</p><h1>${escapeHtml(headline)}</h1><p>${escapeHtml(input.description)}</p>${heroMedia}<a class="generated-cta" href="${escapeHtml(input.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">Explore ${safeName} ↗</a></section><aside class="generated-disclosure"><strong>Affiliate disclosure:</strong> ${disclosure}</aside><section><h2>What is ${safeName}?</h2><p>${escapeHtml(input.description)} This review focuses on practical value for ${safeAudience}.</p></section><section><h2>Key features</h2>${featureHtml}</section>${supportingMedia}<section><h2>Who it is best for</h2><p>${safeName} is positioned for ${safeAudience}. Confirm that its workflow, integrations, and regional availability match your requirements.</p></section><section><h2>Pricing</h2><p>${escapeHtml(input.pricing || "Confirm current pricing and plan limitations before publishing.")}</p></section><section><h2>Advantages and limitations</h2><div class="generated-columns"><div><h3>Potential advantages</h3><p>Clear value should be confirmed through product research or hands-on evaluation.</p></div><div><h3>Points to verify</h3><p>Check current features, plan restrictions, data handling, support, and cancellation terms.</p></div></div></section><section><h2>Frequently asked questions</h2><h3>Is ${safeName} suitable for beginners?</h3><p>Suitability depends on the workflow and should be tested using a realistic task.</p><h3>How much does it cost?</h3><p>${escapeHtml(input.pricing || "Pricing requires confirmation on the official website.")}</p></section><section class="generated-final"><h2>Final recommendation</h2><p>Consider ${safeName} if it solves a repeatable problem for ${safeAudience}. Verify the marked facts and test the product before a long-term commitment.</p><a class="generated-cta" href="${escapeHtml(input.affiliateUrl)}" rel="sponsored nofollow noopener" target="_blank">Visit ${safeName} ↗</a></section>`;
  return {
    title: `${input.name} Review`, slug: `${slugify(input.name)}-review`, pageType: input.pageType,
    seo: { title: `${input.name} Review: Features, Pricing & Practical Verdict`, description: `${input.description.slice(0, 105)} Read the key features, pricing, fit, limitations, and practical verdict.`, keywords: [input.name, `${input.name} review`, input.category, input.audience] },
    hero: { headline, subheadline: input.description, primaryCta: { text: `Explore ${input.name}`, url: input.affiliateUrl } },
    sections, images, html, affiliateDisclosure: disclosure,
    warnings: ["Confirm pricing, current features, and regional availability before publishing.", "Replace any placeholder statements with verified facts.", images.length ? "Online images were retrieved from the official product website. Confirm that they remain accurate and suitable before publishing." : "No official online image could be retrieved. Add a verified product image before publishing."],
  };
}
