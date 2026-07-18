import type { Metadata } from "next";
import AffiliateCta from "../../components/AffiliateCta";

export const metadata: Metadata = {
  title: "Semrush vs Ahrefs vs Ubersuggest (2026): Which SEO Tool Fits You?",
  description:
    "An honest side-by-side comparison of Semrush, Ahrefs, and Ubersuggest: pricing, keyword research, backlink data, ease of use, and which tool fits which budget.",
};

const CAMPAIGN = "semrush-comparison";

const comparisonRows = [
  ["Best for", "All-in-one marketing teams", "Backlink-focused SEO specialists", "Beginners and tight budgets"],
  ["Starting price*", "From $139.95/month (Pro)", "From $129/month (Lite)", "From about $12/month"],
  ["Free option", "7-day free trial + limited free account", "Free Webmaster Tools for your own site", "Limited free daily searches"],
  ["Keyword research", "Excellent — Keyword Magic Tool with deep filtering", "Excellent — strong difficulty scoring", "Good for basics, smaller database"],
  ["Backlink analysis", "Very strong", "Industry benchmark", "Basic"],
  ["Site audits", "Comprehensive technical audits", "Comprehensive technical audits", "Simplified audits"],
  ["PPC / ads research", "Built in — competitor ad copy and spend data", "Not a focus", "Limited"],
  ["Content marketing tools", "Built in — SEO writing assistant, topic research", "Limited", "AI writer included"],
  ["Rank tracking", "Daily, per location and device", "Depends on plan tier", "Included, simpler"],
  ["Learning curve", "Moderate — lots of surface area", "Moderate", "Gentle"],
  ["Lifetime deal", "No", "No", "Yes — one-time purchase option"],
];

const faqs = [
  {
    q: "Is Semrush worth it for a small business?",
    a: "If marketing is a meaningful growth channel for you, usually yes — one Semrush subscription replaces separate tools for keyword research, competitor analysis, rank tracking, technical audits, and ad research. If you only need occasional keyword lookups, start with Ubersuggest or free tools and upgrade when the limits slow you down.",
  },
  {
    q: "What is the biggest difference between Semrush and Ahrefs?",
    a: "Breadth versus depth. Semrush covers the whole marketing workflow — SEO, paid ads, content, and social — in one platform. Ahrefs concentrates on organic search and is best known for its backlink data. Specialist SEO consultants often lean Ahrefs; mixed marketing teams usually get more total value from Semrush.",
  },
  {
    q: "Can I try Semrush before paying?",
    a: "Yes. Semrush offers a free trial and a permanently free account with limited daily usage, so you can test the core tools on your own site before committing to a paid plan.",
  },
  {
    q: "Is Ubersuggest good enough to skip the expensive tools?",
    a: "For beginners, solo bloggers, and small local sites, often yes — it covers keyword ideas, basic audits, and rank tracking at a fraction of the price, with a one-time lifetime purchase option. Its data is smaller and less fresh than Semrush or Ahrefs, which matters as your site and competition grow.",
  },
  {
    q: "Do these tools help with AI search visibility?",
    a: "Semrush has been the fastest of the three to ship features around visibility in AI answers alongside classic search rankings. If appearing in AI-generated answers matters to your strategy, weigh that in its favour — and verify the current feature list on the vendor's site, as this area changes quickly.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function SemrushComparisonPage() {
  return (
    <main>
      <article>
        <section className="review-hero comparison-hero">
          <div className="container">
            <p className="micro-label">Practical comparison · Updated July 2026</p>
            <h1>
              Semrush <span>vs</span> Ahrefs <span>vs</span> Ubersuggest
            </h1>
            <p>
              Three very different answers to the same question: how do I grow search traffic without guessing? Here is
              how they actually compare on price, data, and day-to-day use.
            </p>
          </div>
        </section>

        <div className="container affiliate-notice">
          <strong>Affiliate disclosure:</strong> This page contains affiliate links. If you sign up through them, Fikra
          in Action may earn a commission at no extra cost to you. This never affects the price you pay or how we
          evaluate tools.
        </div>

        <div className="container article-body wide-article">
          <section>
            <h2>The short answer</h2>
            <div className="winner-grid three-up">
              <div>
                <span className="logo-tile logo-orange">S</span>
                <h3>Choose Semrush if…</h3>
                <p>
                  You want one platform for SEO, competitor research, content, and paid ads — and marketing is a real
                  growth channel for your business, not a side experiment.
                </p>
                <AffiliateCta slug="semrush" campaign={CAMPAIGN} position="short-answer">
                  Try Semrush free ↗
                </AffiliateCta>
              </div>
              <div>
                <span className="logo-tile logo-blue">A</span>
                <h3>Choose Ahrefs if…</h3>
                <p>
                  You live and breathe organic search, backlinks decide your rankings, and you do not need paid-ads or
                  broader marketing tooling.
                </p>
                <a href="https://ahrefs.com/" rel="nofollow noopener" target="_blank">
                  Visit Ahrefs ↗
                </a>
              </div>
              <div>
                <span className="logo-tile logo-green">U</span>
                <h3>Choose Ubersuggest if…</h3>
                <p>
                  You are starting out or watching every dollar, and a simpler tool with a one-time purchase option
                  covers what you need today.
                </p>
                <a href="https://neilpatel.com/ubersuggest/" rel="nofollow noopener" target="_blank">
                  Visit Ubersuggest ↗
                </a>
              </div>
            </div>
          </section>

          <section>
            <h2>Side-by-side comparison</h2>
            <div className="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Decision factor</th>
                    <th>Semrush</th>
                    <th>Ahrefs</th>
                    <th>Ubersuggest</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row) => (
                    <tr key={row[0]}>
                      {row.map((cell) => (
                        <td key={cell}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="table-footnote">
              *Prices are list prices at the time of writing (July 2026) and can change — always confirm current
              pricing on the vendor&apos;s site.
            </p>
          </section>

          <section>
            <h2>See Semrush in action</h2>
            <p>
              The fastest way to understand what an all-in-one platform means in practice is to watch the workflow:
              research a keyword, size up the competition, audit your site, and track your positions from one
              dashboard.
            </p>
            <div className="video-embed">
              <iframe
                src="https://www.youtube-nocookie.com/embed/MG6ZEYzl8dA"
                title="Semrush overview — grow your online visibility"
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </section>

          <section>
            <h2>Where Semrush earns its price</h2>
            <div className="feature-list">
              <div>
                <span>01</span>
                <div>
                  <h3>Keyword research with real filtering power</h3>
                  <p>
                    The Keyword Magic Tool groups thousands of related keywords by topic, intent, and difficulty, which
                    turns &ldquo;what should I write about?&rdquo; into a sorted to-do list.
                  </p>
                </div>
              </div>
              <div>
                <span>02</span>
                <div>
                  <h3>Competitor intelligence, organic and paid</h3>
                  <p>
                    See which keywords and pages drive a competitor&apos;s traffic — and, unlike the other two tools
                    here, what they are running in paid search as well.
                  </p>
                </div>
              </div>
              <div>
                <span>03</span>
                <div>
                  <h3>Technical audits that prioritise</h3>
                  <p>
                    Site Audit crawls your site and ranks issues by impact, so a small team fixes the five things that
                    matter instead of drowning in a 400-row export.
                  </p>
                </div>
              </div>
              <div>
                <span>04</span>
                <div>
                  <h3>One login instead of five subscriptions</h3>
                  <p>
                    Rank tracking, content optimisation, backlink monitoring, and ad research live in one place — the
                    honest comparison is not tool vs tool, but Semrush vs the stack of tools it replaces.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2>Strengths and trade-offs</h2>
            <div className="two-column-points">
              <div>
                <h3>Where Semrush shines</h3>
                <ul>
                  <li>Broadest feature set of the three — SEO, PPC, content, and social in one subscription</li>
                  <li>Free trial and a limited free tier to test before paying</li>
                  <li>Long attribution on decisions: strong reporting for showing results to clients or managers</li>
                  <li>Fast-moving product — including features for visibility in AI-generated answers</li>
                </ul>
              </div>
              <div>
                <h3>Where it falls short</h3>
                <ul>
                  <li>Meaningful monthly cost — overkill if you only need occasional keyword lookups</li>
                  <li>So many tools that new users need a week to find their routine</li>
                  <li>One user per subscription on the entry plan; extra seats cost more</li>
                  <li>Specialist link-builders may still prefer Ahrefs&apos; backlink index</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2>Pricing at a glance</h2>
            <div className="pricing-box">
              <div>
                <span>Semrush Pro · monthly, at the time of writing</span>
                <strong>$139.95/mo</strong>
              </div>
              <p>
                Aimed at freelancers and in-house marketers. Higher tiers add more projects, users, and historical
                data. Annual billing reduces the effective monthly price, and the free trial lets you test the full
                workflow first.
              </p>
              <AffiliateCta slug="semrush" campaign={CAMPAIGN} position="pricing">
                Check current Semrush pricing ↗
              </AffiliateCta>
            </div>
            <div className="pricing-box">
              <div>
                <span>Ahrefs Lite · monthly, at the time of writing</span>
                <strong>$129/mo</strong>
              </div>
              <p>
                Comparable entry price to Semrush with a narrower, deeper focus on organic search and backlinks. Free
                Webmaster Tools cover basic audits for sites you own.
              </p>
            </div>
            <div className="pricing-box">
              <div>
                <span>Ubersuggest · monthly, at the time of writing</span>
                <strong>~$12/mo</strong>
              </div>
              <p>
                A different weight class on price, including a one-time lifetime purchase option. Expect smaller
                databases and simpler reports in exchange.
              </p>
            </div>
          </section>

          <section>
            <h2>Our recommendation</h2>
            <p>
              Match the tool to the job your business actually has. If search is one channel among several and you
              also run ads or produce content at any volume, Semrush is the only one of the three that covers the whole
              workflow — start with the free trial and pressure-test it on your own site for a week. If you are a
              dedicated SEO specialist whose work starts and ends with organic rankings and link profiles, Ahrefs is a
              worthy alternative. And if you are at the beginning — first site, first hundred visitors — Ubersuggest
              gets you moving for the price of lunch, and you can graduate later.
            </p>
            <div className="verdict-box">
              <h2>Best overall for growing businesses: Semrush</h2>
              <p>
                One subscription that answers what to write, how to outrank competitors, what is broken on your site,
                and what your rivals spend on ads.
              </p>
              <AffiliateCta slug="semrush" campaign={CAMPAIGN} position="verdict" className="affiliate-cta">
                <span>Start your free Semrush trial</span> ↗
              </AffiliateCta>
              <small>Affiliate link — we may earn a commission, at no extra cost to you.</small>
            </div>
          </section>

          <section>
            <h2>Frequently asked questions</h2>
            {faqs.map((item) => (
              <details key={item.q}>
                <summary>{item.q}</summary>
                <p>{item.a}</p>
              </details>
            ))}
          </section>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      </article>
    </main>
  );
}
