"use client";

import Link from "next/link";
import { useState } from "react";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="brand" href="/" aria-label="Fikra in Action home">
          <span className="brand-mark"><i>F</i><b>→</b></span>
          <span>Fikra<small>in action</small></span>
        </Link>
        <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">
          <span /><span /><span />
        </button>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <Link href="/tools">AI Tools</Link>
          <Link href="/tools?category=software">Software</Link>
          <Link href="/comparisons">Comparisons</Link>
          <Link href="/tutorials">Tutorials</Link>
          <Link href="/deals">Deals</Link>
          <Link href="/blog">Blog</Link>
        </nav>
        <div className="nav-actions">
          <Link className="search-button" href="/tools" aria-label="Search">⌕</Link>
          <Link className="admin-link" href="/admin">Admin</Link>
          <Link className="nav-cta" href="/tools">Find a tool <span>→</span></Link>
        </div>
      </div>
    </header>
  );
}
