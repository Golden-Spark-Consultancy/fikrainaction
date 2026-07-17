import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/Header";
import { posts } from "../../lib/data";

export const metadata: Metadata = { title: "Practical Technology Guides", description: "Useful guides for choosing, adopting, and getting more from AI tools and software." };

export default function BlogPage() { return <main><Header /><section className="directory-hero"><div className="container compact-hero"><p className="eyebrow"><span /> Practical ideas, applied</p><h1>Guides that help you move forward.</h1><p>Clear tutorials, selection frameworks, and lessons for using technology with confidence.</p></div></section><section className="container section"><div className="post-grid">{posts.map((post, index) => <article className="post-card" key={post.slug}><div className={`post-visual visual-${index + 1}`}><span>{post.visual}</span></div><div className="post-content"><p className="micro-label">{post.category} · {post.readTime}</p><h2>{post.title}</h2><p>{post.excerpt}</p><Link href={`/blog/${post.slug}`}>Read guide →</Link></div></article>)}</div></section></main>; }
