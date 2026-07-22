import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { categories, tools } from "../../../lib/data";
import { CategoryDirectory } from "./CategoryDirectory";

type Props = { params: Promise<{ slug: string }> };
export function generateStaticParams() { return categories.map(({ slug }) => ({ slug })); }
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { slug } = await params; const category = categories.find((item) => item.slug === slug); if (!category) return {}; return { title: `${category.name}: Reviews, Comparisons, Tutorials & Deals`, description: category.description, alternates: { canonical: `/category/${category.slug}` } }; }

function matches(slug: string, category: string) {
  const value = category.toLowerCase();
  if (slug === "marketing-software") return /marketing|work management/.test(value);
  if (slug === "creator-platforms") return /creator|course|community|newsletter|membership/.test(value);
  if (slug === "web-hosting") return /host|wordpress|cloud|vps|domain/.test(value);
  return !/marketing|work management|creator|course|community|newsletter|membership|host|wordpress|cloud|vps|domain/.test(value);
}

export default async function CategoryPage({ params }: Props) { const { slug } = await params; const category = categories.find((item) => item.slug === slug); if (!category) notFound(); const categoryTools = tools.filter((tool) => matches(slug, tool.category)); return <main><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: "/" }, { "@type": "ListItem", position: 2, name: category.name, item: `/category/${slug}` }] }) }} /><div className="container breadcrumb"><Link href="/">Home</Link><span>›</span><strong>{category.name}</strong></div><section className="category-hero"><div className="container"><i className={`category-dot ${category.color}`}>{category.icon}</i><p className="micro-label">Fikra in Action category</p><h1>{category.name}</h1><p>{category.description}</p></div></section><section className="section container"><div className="category-section-nav"><a href="#platforms">Featured platforms</a><a href="#latest">Latest reviews</a><a href="#comparisons">Comparisons</a><a href="#guides">Tutorials & guides</a><a href="#deals">Deals</a></div><div id="platforms" className="section-heading"><div><p className="micro-label">Discover and compare</p><h2>Featured platforms</h2></div></div><CategoryDirectory tools={categoryTools} /><div className="category-content-sections"><section id="latest"><h2>Latest reviews</h2><p>Independent evaluations focused on quality, usefulness, pricing, reputation and audience suitability.</p></section><section id="comparisons"><h2>Platform comparisons</h2><p>Clear, responsive comparisons of features, pricing, strengths and limitations.</p></section><section id="guides"><h2>Tutorials and guides</h2><p>Practical guidance to help you choose, set up and get value from each platform.</p></section><section id="deals"><h2>Available deals</h2><p>Verified promotional offers will appear here. Terms and availability can change.</p></section></div><div className="affiliate-notice"><strong>Affiliate disclosure:</strong> Fikra in Action may earn a commission from qualifying links at no extra cost to you. Commissions never determine rankings on their own.</div></section></main>; }
