import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { tools } from "../../../lib/data";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return tools.map((tool) => ({ slug: tool.slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);
  if (!tool) return {};
  return { title: `${tool.name} Review`, description: `${tool.description} Read our balanced review, pricing summary, best use cases, advantages, and limitations.` };
}

export default async function ToolReview({ params }: Props) {
  const { slug } = await params;
  const tool = tools.find((item) => item.slug === slug);
  if (!tool) notFound();
  const related = tools.filter((item) => item.slug !== tool.slug).slice(0, 3);

  return (
    <main>

      <article>
        <div className="container breadcrumb"><Link href="/tools">Tools</Link><span>›</span><span>{tool.category}</span><span>›</span><strong>{tool.name}</strong></div>
        <section className="review-hero">
          <div className="container review-hero-grid">
            <div><div className="review-title-row"><span className={`logo-tile large-logo ${tool.logoClass}`}>{tool.logo}</span><div><p className="micro-label">Independent practical review</p><h1>{tool.name}</h1></div></div><p className="review-summary">{tool.description}</p><div className="review-meta"><span><strong>{tool.rating}</strong>/5 editor rating</span><span>Best for: <strong>{tool.bestFor}</strong></span><span>Verified July 2026</span></div></div>
            <aside className="verdict-box"><span className="soft-badge">Quick verdict</span><h2>A strong choice for {tool.bestFor.toLowerCase()}.</h2><p>Consider it when its core workflow matches your needs, and test the available plan before committing.</p><Link className="affiliate-cta" href={`/go/${tool.slug}`} target="_blank" rel="sponsored nofollow noopener">Visit {tool.name} <span>↗</span></Link><small>Affiliate link · no extra cost to you</small></aside>
          </div>
        </section>
        <div className="container affiliate-notice"><strong>Affiliate disclosure:</strong> Fikra in Action may earn a commission when you purchase or register through links on this page. This does not affect the price you pay or our editorial evaluation.</div>
        <div className="container article-layout">
          <div className="article-body">
            <section><p className="micro-label">The essentials</p><h2>What is {tool.name}?</h2><p>{tool.name} is designed to help {tool.bestFor.toLowerCase()} work more efficiently. Its strongest value is not the number of features it offers, but how clearly those features support repeatable everyday work.</p></section>
            <section><h2>What stands out</h2><div className="feature-list">{tool.highlights.map((item, index) => <div key={item}><span>0{index + 1}</span><div><h3>{item}</h3><p>A practical capability that can reduce friction when it is applied to the right workflow.</p></div></div>)}</div></section>
            <section><h2>Who it is for—and who should pause</h2><div className="two-column-points"><div><h3>Good fit</h3><ul><li>{tool.bestFor}</li><li>People willing to establish a repeatable workflow</li><li>Teams that value a well-supported platform</li></ul></div><div><h3>Consider alternatives if</h3><ul><li>You need a highly specialized niche feature</li><li>Your budget cannot support ongoing subscriptions</li><li>You want a fully offline solution</li></ul></div></div></section>
            <section><h2>Pricing at a glance</h2><div className="pricing-box"><div><span>Published starting point</span><strong>{tool.price}</strong></div><p>Pricing and plan details can change. Confirm current features, regional availability, and billing terms on the official website before purchasing.</p><Link href={`/go/${tool.slug}`} target="_blank" rel="sponsored nofollow noopener">Check current pricing ↗</Link></div></section>
            <section><h2>Frequently asked questions</h2><details><summary>Is {tool.name} suitable for beginners?</summary><p>Its suitability depends on the workflow, but the core experience is accessible enough to test before making a long-term commitment.</p></details><details><summary>Does {tool.name} offer a free option?</summary><p>{tool.price.toLowerCase().includes("free") ? "A free plan is listed, though features and usage limits should be confirmed on the official site." : "A permanent free plan is not confirmed in this review. Check the official site for trial or promotional options."}</p></details><details><summary>How did Fikra in Action evaluate it?</summary><p>We assess practical usefulness, ease of adoption, pricing clarity, limitations, and the quality of the overall user experience.</p></details></section>
          </div>
          <aside className="article-rail"><div className="rail-card"><p className="micro-label">Review summary</p><div><span>Ease of use</span><strong>Excellent</strong></div><div><span>Value</span><strong>Very good</strong></div><div><span>Features</span><strong>Strong</strong></div><div><span>Rating</span><strong>{tool.rating}/5</strong></div><Link href={`/go/${tool.slug}`} target="_blank" rel="sponsored nofollow noopener">Try {tool.name} ↗</Link></div></aside>
        </div>
        <section className="related-tools"><div className="container"><div className="section-heading"><div><p className="micro-label">Keep comparing</p><h2>Related tools</h2></div><Link href="/tools">All tools →</Link></div><div className="mini-tool-grid">{related.map((item) => <Link href={`/tools/${item.slug}`} key={item.slug}><span className={`logo-tile ${item.logoClass}`}>{item.logo}</span><div><strong>{item.name}</strong><small>{item.category} · {item.rating}/5</small></div><b>→</b></Link>)}</div></div></section>
      </article>
    </main>
  );
}
