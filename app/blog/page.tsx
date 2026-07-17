import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../components/Header";
import { posts } from "../../lib/data";
import { getAdminFirestore } from "../../lib/firebase/admin";

export const metadata: Metadata = { title: "Practical Technology Guides", description: "Useful guides for choosing, adopting, and getting more from AI tools and software." };
export const dynamic = "force-dynamic";

async function getPosts() {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("blogPosts").where("status", "==", "published").limit(50).get();
    const saved = snapshot.docs.map((document, index) => {
      const post = document.data();
      return { slug: document.id, category: post.category, readTime: post.readTime || "5 min", visual: String(index + 4).padStart(2, "0"), title: post.title, excerpt: post.excerpt };
    });
    return [...saved, ...posts.filter((post) => !saved.some((savedPost) => savedPost.slug === post.slug))];
  } catch {
    return posts;
  }
}

export default async function BlogPage() { const allPosts = await getPosts(); return <main><Header /><section className="directory-hero"><div className="container compact-hero"><p className="eyebrow"><span /> Practical ideas, applied</p><h1>Guides that help you move forward.</h1><p>Clear tutorials, selection frameworks, and lessons for using technology with confidence.</p></div></section><section className="container section"><div className="post-grid">{allPosts.map((post, index) => <article className="post-card" key={post.slug}><div className={`post-visual visual-${index % 3 + 1}`}><span>{post.visual}</span></div><div className="post-content"><p className="micro-label">{post.category} · {post.readTime}</p><h2>{post.title}</h2><p>{post.excerpt}</p><Link href={`/blog/${post.slug}`}>Read guide →</Link></div></article>)}</div></section></main>; }
