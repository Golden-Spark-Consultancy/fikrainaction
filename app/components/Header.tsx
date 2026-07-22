"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { categories } from "../../lib/data";

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <Link className="navbar-brand" href="/" aria-label="Fikra in Action home">
          <Image
            className="nav-logo"
            src="/fikra-in-action-logo.png"
            alt="Fikra in Action"
            width={1170}
            height={607}
            priority
            unoptimized
          />
        </Link>
        <button className="mobile-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Toggle navigation">
          <span /><span /><span />
        </button>
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <div className="nav-dropdown"><button type="button">Categories <span>⌄</span></button><div>{categories.map((category) => <Link key={category.slug} href={`/category/${category.slug}`}>{category.name}</Link>)}</div></div>
          {categories.map((category) => <Link className="category-direct" key={category.slug} href={`/category/${category.slug}`}>{category.name}</Link>)}
          <Link href="/comparisons">Comparisons</Link>
          <Link href="/tutorials">Tutorials</Link>
          <Link href="/deals">Deals</Link>
          <Link href="/blog">Blog</Link>
        </nav>
        <div className="nav-actions">
          <Link className="search-button" href="/tools" aria-label="Search">⌕</Link>
          <Link className="nav-cta" href="/tools">Find a tool <span>→</span></Link>
        </div>
      </div>
    </header>
  );
}
