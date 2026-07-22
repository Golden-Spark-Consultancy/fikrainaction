"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tool } from "../../../lib/data";

export function CategoryDirectory({ tools }: { tools: Tool[] }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All content");
  const visible = useMemo(() => tools.filter((tool) => `${tool.name} ${tool.description} ${tool.bestFor}`.toLowerCase().includes(query.toLowerCase())), [query, tools]);
  return <><div className="category-filters"><label><span className="sr-only">Search platforms</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search platforms…" /></label><select value={type} onChange={(event) => setType(event.target.value)} aria-label="Filter by content type"><option>All content</option><option>Reviews</option><option>Comparisons</option><option>Tutorials</option><option>Deals</option><option>Alternatives</option></select></div><div className="category-platform-grid">{visible.map((tool) => <article key={tool.slug}><span className={`logo-tile ${tool.logoClass}`}>{tool.logo}</span><div><p className="micro-label">{type === "All content" ? "Review" : type}</p><h3>{tool.name}</h3><p>{tool.description}</p><div className="rating-row"><span>★★★★★</span><strong>{tool.rating}</strong></div><Link href={`/tools/${tool.slug}`}>View platform →</Link></div></article>)}{!visible.length && <div className="empty-state"><strong>No matching platforms.</strong><p>Try another search.</p></div>}</div></>;
}
