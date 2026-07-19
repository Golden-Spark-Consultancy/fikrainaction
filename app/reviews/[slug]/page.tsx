import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminFirestore } from "../../../lib/firebase/admin";
import { findYouTubeVideos } from "../../../lib/ai-landing-page";

type Props = { params: Promise<{ slug: string }> };
type PublishedPage = { title: string; status: string; seoTitle: string; metaDescription: string; html: string; affiliateUrl?: string; updatedAt?: { toDate(): Date } };

async function findPage(slug: string): Promise<PublishedPage | null> {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db.collection("landingPages").doc(slug).get();
    return snapshot.exists ? snapshot.data() as PublishedPage : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await findPage(slug);
  return page ? { title: page.seoTitle, description: page.metaDescription } : {};
}

export default async function GeneratedReview({ params }: Props) {
  const { slug } = await params;
  const page = await findPage(slug);
  if (!page || page.status !== "published") notFound();
  const updated = page.updatedAt?.toDate?.() ?? new Date();
  const hasIdentity = page.html.includes("generated-platform-identity");
  const hasVideos = page.html.includes("generated-video-grid") || page.html.includes("generated-video-fallback");
  const videos = hasVideos ? [] : await findYouTubeVideos(page.title);
  const favicon = page.affiliateUrl ? `https://www.google.com/s2/favicons?domain_url=${encodeURIComponent(page.affiliateUrl)}&sz=128` : "";
  const platformName = page.title.replace(/\s+(review|guide).*$/i, "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
  const identity = !hasIdentity && favicon ? `<div class="generated-platform-identity generated-platform-identity-legacy"><img src="${favicon}" alt="Platform website icon" width="52" height="52"/><span><small>Featured platform</small><strong>${platformName}</strong></span></div>` : "";
  const html = identity ? page.html.replace(/(<section[^>]*class=["'][^"']*generated-hero[^"']*["'][^>]*>)/i, `$1${identity}`) : page.html;
  return <main><article className="generated-page"><div className="container generated-content" dangerouslySetInnerHTML={{ __html: html }} />{!hasVideos && <section className="container generated-runtime-videos"><h2>Helpful videos and tutorials</h2>{videos.length ? <div className="generated-video-grid">{videos.map((video) => <article key={video.id}><iframe src={video.embedUrl} title={video.title} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /><h3>{video.title}</h3><p>{video.channelTitle}</p></article>)}</div> : <div className="generated-video-fallback"><p>See current walkthroughs and independent reviews for this platform.</p><a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${page.title} tutorial review`)}`} target="_blank" rel="noopener nofollow">Find videos on YouTube ↗</a></div>}</section>}<div className="container generated-meta">Last updated {updated.toLocaleDateString("en-GB")} · Editorial status: Published</div></article></main>;
}
