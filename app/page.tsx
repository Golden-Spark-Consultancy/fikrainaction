import Link from "next/link";
import { Footer } from "./components/Footer";
import { categories, posts, tools } from "../lib/data";

const featured = tools.slice(0, 3);

export default function Home() {
  return (
    <main>


      <section className="hero-shell">
        <div className="hero-glow" aria-hidden="true" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><span /> Practical technology, clearly explained</div>
            <h1>Turn a useful idea into your <em>next action.</em></h1>
            <p className="hero-lead">
              Discover, understand, and compare the AI tools and software that
              can genuinely move your work forward.
            </p>
            <form className="hero-search" action="/tools">
              <span aria-hidden="true">⌕</span>
              <label className="sr-only" htmlFor="hero-search">Search tools</label>
              <input id="hero-search" name="q" placeholder="Search tools, reviews or comparisons…" />
              <button type="submit">Explore tools <span aria-hidden="true">→</span></button>
            </form>
            <div className="hero-proof">
              <div className="avatar-stack" aria-hidden="true"><i>AI</i><i>PX</i><i>MK</i></div>
              <p><strong>Independent, practical reviews</strong><br />Built for people who want to act, not browse endlessly.</p>
            </div>
          </div>

          <div className="hero-showcase" aria-label="Featured tool recommendation">
            <div className="showcase-orbit orbit-one" />
            <div className="showcase-orbit orbit-two" />
            <article className="spotlight-card">
              <div className="spotlight-top">
                <span className="logo-tile logo-violet">N</span>
                <span className="pick-badge">Editor&apos;s pick</span>
              </div>
              <p className="micro-label">AI productivity</p>
              <h2>Notion AI</h2>
              <p>Turn scattered notes into clear plans, summaries, and useful first drafts.</p>
              <div className="rating-row"><span>★★★★★</span><strong>4.8</strong><small>Our rating</small></div>
              <Link className="spotlight-link" href="/tools/notion-ai">Read the practical review <span>↗</span></Link>
            </article>
            <div className="float-chip chip-top"><strong>6</strong><span>tools tested<br />this week</span></div>
            <div className="float-chip chip-bottom"><strong>✓</strong><span>Transparent<br />methodology</span></div>
          </div>
        </div>
        <div className="container category-strip">
          <span>Explore by goal</span>
          <div>{categories.slice(0, 5).map((category) => (
            <Link href={`/tools?category=${category.slug}`} key={category.slug}>
              <i className={`category-dot ${category.color}`} aria-hidden="true">{category.icon}</i>{category.name}
            </Link>
          ))}</div>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><p className="micro-label">Start with the shortlist</p><h2>Tools worth your attention</h2></div>
          <Link href="/tools">Browse all tools <span>→</span></Link>
        </div>
        <div className="tool-grid">
          {featured.map((tool) => (
            <article className="tool-card" key={tool.slug}>
              <div className="tool-card-head">
                <span className={`logo-tile ${tool.logoClass}`}>{tool.logo}</span>
                {tool.badge && <span className="soft-badge">{tool.badge}</span>}
              </div>
              <p className="micro-label">{tool.category}</p>
              <h3>{tool.name}</h3>
              <p>{tool.description}</p>
              <ul>{tool.highlights.slice(0, 2).map((item) => <li key={item}>✓ {item}</li>)}</ul>
              <div className="tool-card-foot"><span><strong>{tool.rating}</strong>/5 rating</span><Link href={`/tools/${tool.slug}`}>View review →</Link></div>
            </article>
          ))}
        </div>
      </section>

      <section className="section pale-section">
        <div className="container decision-grid">
          <div className="decision-copy">
            <p className="micro-label">Compare with confidence</p>
            <h2>Clear differences.<br />Better decisions.</h2>
            <p>Our side-by-side comparisons focus on what changes your decision: price, capabilities, limitations, and fit.</p>
            <Link className="text-link" href="/compare/notion-ai-vs-clickup">Explore comparisons <span>→</span></Link>
          </div>
          <article className="comparison-card">
            <div className="comparison-title"><div><span className="logo-tile logo-violet">N</span><b>Notion AI</b></div><span>vs</span><div><span className="logo-tile logo-blue">C</span><b>ClickUp Brain</b></div></div>
            <div className="comparison-row"><span>Best for</span><strong>Flexible knowledge</strong><strong>Project execution</strong></div>
            <div className="comparison-row"><span>Free plan</span><strong className="yes">Available</strong><strong className="yes">Available</strong></div>
            <div className="comparison-row"><span>Ease of use</span><strong>Excellent</strong><strong>Very good</strong></div>
            <Link href="/compare/notion-ai-vs-clickup">See the full comparison →</Link>
          </article>
        </div>
      </section>

      <section className="section container">
        <div className="section-heading">
          <div><p className="micro-label">Learn before you choose</p><h2>Latest practical guides</h2></div>
          <Link href="/blog">Visit the blog <span>→</span></Link>
        </div>
        <div className="post-grid">
          {posts.map((post, index) => (
            <article className="post-card" key={post.slug}>
              <div className={`post-visual visual-${index + 1}`}><span>{post.visual}</span></div>
              <div className="post-content"><p className="micro-label">{post.category} · {post.readTime}</p><h3>{post.title}</h3><p>{post.excerpt}</p><Link href={`/blog/${post.slug}`}>Read guide →</Link></div>
            </article>
          ))}
        </div>
      </section>

      <section className="container newsletter">
        <div><p className="micro-label">One useful idea at a time</p><h2>Make technology work for you.</h2><p>Practical tools, honest comparisons, and clear tutorials—delivered without the noise.</p></div>
        <form><label className="sr-only" htmlFor="email">Email address</label><input id="email" type="email" placeholder="Your email address" /><button>Join the newsletter</button></form>
      </section>

      <Footer />
    </main>
  );
}
