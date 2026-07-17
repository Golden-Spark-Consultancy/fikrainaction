import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminFirestore } from "../../../lib/firebase/admin";

type Props = { params: Promise<{ slug: string }> };
type PublishedPage = { title: string; status: string; seoTitle: string; metaDescription: string; html: string; updatedAt?: { toDate(): Date } };

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
  return <main><article className="generated-page"><div className="container generated-content" dangerouslySetInnerHTML={{ __html: page.html }} /><div className="container generated-meta">Last updated {updated.toLocaleDateString("en-GB")} · Editorial status: Published</div></article></main>;
}
