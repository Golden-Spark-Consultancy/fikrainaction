import type { Metadata } from "next";
import { posts } from "../../lib/data";
import { getAdminFirestore } from "../../lib/firebase/admin";
import { PostCard } from "../components/PostCard";

export const metadata: Metadata = {
  title: "Practical Technology Guides",
  description:
    "Useful guides for choosing, adopting, and getting more from AI tools and software.",
};
export const dynamic = "force-dynamic";

async function getPosts() {
  try {
    const db = await getAdminFirestore();
    const snapshot = await db
      .collection("blogPosts")
      .where("status", "==", "published")
      .limit(50)
      .get();
    const saved = snapshot.docs.map((document) => {
      const post = document.data();
      return {
        slug: document.id,
        category: String(post.category || ""),
        readTime: String(post.readTime || "5 min"),
        title: String(post.title || document.id),
        excerpt: String(post.excerpt || ""),
        thumbnailUrl: String(post.thumbnailUrl || ""),
      };
    });
    return [
      ...saved,
      ...posts
        .filter((post) => !saved.some((savedPost) => savedPost.slug === post.slug))
        .map((post) => ({
          slug: post.slug,
          category: post.category,
          readTime: post.readTime,
          title: post.title,
          excerpt: post.excerpt,
          thumbnailUrl: "",
        })),
    ];
  } catch {
    return posts.map((post) => ({
      slug: post.slug,
      category: post.category,
      readTime: post.readTime,
      title: post.title,
      excerpt: post.excerpt,
      thumbnailUrl: "",
    }));
  }
}

export default async function BlogPage() {
  const allPosts = await getPosts();
  return (
    <main>
      <section className="directory-hero">
        <div className="container compact-hero">
          <p className="eyebrow">
            <span /> Practical ideas, applied
          </p>
          <h1>Guides that help you move forward.</h1>
          <p>
            Clear tutorials, selection frameworks, and lessons for using technology with
            confidence.
          </p>
        </div>
      </section>
      <section className="container section">
        <div className="post-grid">
          {allPosts.map((post) => (
            <PostCard
              key={post.slug}
              href={`/blog/${post.slug}`}
              title={post.title}
              thumbnailUrl={post.thumbnailUrl || undefined}
              thumbnailAlt={post.title}
              meta={`${post.category} · ${post.readTime}`}
              excerpt={post.excerpt}
              readMoreLabel="Read guide →"
            />
          ))}
        </div>
      </section>
    </main>
  );
}
