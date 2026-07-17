"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tool } from "../../lib/data";

export function ToolsDirectory({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [freeOnly, setFreeOnly] = useState(false);
  const categories = ["All categories", ...Array.from(new Set(tools.map((tool) => tool.category)))];

  const filtered = useMemo(() => tools.filter((tool) => {
    const haystack = `${tool.name} ${tool.description} ${tool.category} ${tool.bestFor}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) &&
      (category === "All categories" || tool.category === category) &&
      (!freeOnly || tool.price.toLowerCase().includes("free"));
  }), [tools, query, category, freeOnly]);

  return (
    <section className="container directory-layout">
      <aside className="filter-panel">
        <p className="micro-label">Filter directory</p>
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label className="check-label"><input type="checkbox" checked={freeOnly} onChange={(event) => setFreeOnly(event.target.checked)} /><span>Free plan available</span></label>
        <div className="method-note"><strong>How we choose</strong><p>We evaluate usability, real value, pricing clarity, and limitations—not just feature lists.</p><Link href="/review-methodology">Our methodology →</Link></div>
      </aside>
      <div className="directory-results">
        <div className="directory-toolbar">
          <label className="directory-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by tool, task, or category" /></label>
          <span>{filtered.length} tools</span>
        </div>
        <div className="directory-cards">
          {filtered.map((tool) => (
            <article className="directory-card" key={tool.slug}>
              <span className={`logo-tile ${tool.logoClass}`}>{tool.logo}</span>
              <div className="directory-card-main"><div><p className="micro-label">{tool.category}</p><h2>{tool.name}</h2></div><p>{tool.description}</p><div className="directory-tags"><span>{tool.price}</span><span>Best for: {tool.bestFor}</span></div></div>
              <div className="directory-card-action"><span className="score"><strong>{tool.rating}</strong>/5</span>{tool.badge && <span className="soft-badge">{tool.badge}</span>}<Link href={`/tools/${tool.slug}`}>View review →</Link></div>
            </article>
          ))}
          {filtered.length === 0 && <div className="empty-state"><strong>No matching tools yet.</strong><p>Try a broader search or remove one of the filters.</p><button onClick={() => { setQuery(""); setCategory("All categories"); setFreeOnly(false); }}>Clear filters</button></div>}
        </div>
      </div>
    </section>
  );
}
