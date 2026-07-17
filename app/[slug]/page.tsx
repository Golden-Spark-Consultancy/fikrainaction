import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { contentPages, type ContentPage } from "../../lib/content-pages";

const fallbackPages: Record<string, ContentPage> = {
  tutorials: {
    label: "Learn by doing",
    title: "Step-by-step tutorials.",
    description: "Practical technology tutorials from Fikra in Action.",
    intro: "Practical walkthroughs that move from setup to a useful result.",
    updated: "17 July 2026",
    sections: [{
      title: "Tutorial library coming next",
      paragraphs: ["The publishing system is ready for structured tutorials with requirements, numbered steps, screenshots, tips, and troubleshooting."],
    }],
  },
  deals: {
    label: "Verified offers",
    title: "Deals worth checking.",
    description: "Verified technology offers and trials from Fikra in Action.",
    intro: "Current promotions and trial offers, with clear eligibility, expiry, and redemption information.",
    updated: "17 July 2026",
    sections: [{
      title: "No unverified offers",
      paragraphs: ["We only publish deal terms after they have been confirmed. New verified offers will appear here."],
    }],
  },
};

const pages = { ...contentPages, ...fallbackPages };

function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) return {};

  return {
    title: page.title.replace(/[.]$/, ""),
    description: page.description,
    alternates: { canonical: `/${slug === "terms-of-service" ? "terms" : slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      type: "article",
    },
  };
}

export default async function StaticPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pages[slug];
  if (!page) notFound();

  return (
    <main>

      <article className="policy-page">
        <header className="content-hero">
          <div className="container narrow">
            <p className="micro-label">{page.label}</p>
            <h1>{page.title}</h1>
            <p className="content-intro">{page.intro}</p>
            <div className="policy-meta">
              <span>Last updated</span>
              <strong>{page.updated}</strong>
            </div>
          </div>
        </header>

        <div className="container policy-layout">
          <aside className="policy-toc" aria-label="On this page">
            <strong>On this page</strong>
            <nav>
              {page.sections.map((section) => (
                <a href={`#${sectionId(section.title)}`} key={section.title}>{section.title}</a>
              ))}
            </nav>
          </aside>

          <div className="policy-content">
            {page.notice && <p className="policy-callout">{page.notice}</p>}
            {page.sections.map((section) => (
              <section className="policy-section" id={sectionId(section.title)} key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                {section.bullets && (
                  <ul className="policy-list">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
                {section.links && (
                  <div className="policy-links">
                    {section.links.map((link) => {
                      const external = link.href.startsWith("http");
                      return (
                        <Link
                          className="policy-link"
                          href={link.href}
                          key={link.href}
                          rel={external ? "noopener noreferrer" : undefined}
                          target={external ? "_blank" : undefined}
                        >
                          {link.label} <span aria-hidden="true">→</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
            <div className="article-end">
              <strong>Continue exploring</strong>
              <Link href="/tools">Browse practical tools →</Link>
            </div>
          </div>
        </div>
      </article>
    </main>
  );
}
