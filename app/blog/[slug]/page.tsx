import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "../../components/Header";
import { posts } from "../../../lib/data";
import { getAdminFirestore } from "../../../lib/firebase/admin";

async function getSavedPost(slug: string) {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("blogPosts").doc(slug).get();
    const post = snapshot.data();
    return snapshot.exists && post?.status === "published" ? post as { title: string; category: string; readTime: string; excerpt: string; html: string; updatedAt?: { toDate(): Date } } : null;
  } catch {
    return null;
  }
}

export default async function BlogPost({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const saved = await getSavedPost(slug);
  if (saved) {
    const updated = saved.updatedAt?.toDate?.() ?? new Date();
    return <main><Header /><article><section className="article-hero"><div className="container narrow"><p className="micro-label">{saved.category} · {saved.readTime} read</p><h1>{saved.title}</h1><p>{saved.excerpt}</p><div className="author-line"><span>FiA</span><p><strong>Fikra Editorial Team</strong><br />Reviewed {updated.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</p></div></div></section><div className="container article-body narrow" dangerouslySetInnerHTML={{ __html: saved.html }} /></article></main>;
  }
  const post = posts.find((item) => item.slug === slug); if (!post) notFound();
  return <main><Header /><article><section className="article-hero"><div className="container narrow"><p className="micro-label">{post.category} · {post.readTime} read</p><h1>{post.title}</h1><p>{post.excerpt}</p><div className="author-line"><span>FiA</span><p><strong>Fikra Editorial Team</strong><br />Reviewed July 2026</p></div></div></section><div className="container article-body narrow"><p className="article-intro">A good technology decision begins with a clear problem. The goal is not to collect tools—it is to choose the smallest, most reliable solution that improves the work.</p><h2>Begin with the outcome</h2><p>Write down what should become faster, clearer, or more consistent. If you cannot describe the expected improvement in one sentence, the tool is probably being considered too early.</p><h2>Test the real workflow</h2><p>Use a genuine task during the trial. A polished demonstration may show what is possible, but only your own work reveals whether the product fits your team, data, budget, and habits.</p><blockquote>Choose for repeatable value, not novelty.</blockquote><h2>Review the full cost</h2><p>Look beyond the advertised starting price. Consider required seats, usage limits, integrations, training time, and the cost of moving away later.</p><h2>Make a confident decision</h2><p>Score the option against the outcome, adoption effort, ongoing cost, and known limitations. The best choice is the one your team can use consistently and responsibly.</p><div className="article-end"><strong>Ready to explore?</strong><Link href="/tools">Browse the tools directory →</Link></div></div></article></main>;
}
