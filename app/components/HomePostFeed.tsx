import Image from "next/image";
import Link from "next/link";
import { localizedPath, type Locale } from "../../lib/i18n/config";

export type HomeFeedPost = {
  slug: string;
  title: string;
  excerpt: string;
  readingTimeMinutes: number;
  thumbnailUrl?: string;
  thumbnailAlt?: string;
};

function Media({
  post,
  className,
}: {
  post: HomeFeedPost;
  className?: string;
}) {
  const hasThumb = Boolean(post.thumbnailUrl?.trim());
  return (
    <span className={className} aria-hidden="true">
      {hasThumb ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnailUrl} alt="" loading="lazy" />
      ) : (
        <span className="home-tile-fallback">
          <Image
            src="/fikra-in-action-logo.png"
            alt=""
            width={180}
            height={180}
            unoptimized
            className="home-tile-fallback-logo"
          />
        </span>
      )}
    </span>
  );
}

/** Featured banner + asymmetric mosaic — not a uniform post grid. */
export function HomePostFeed({
  locale,
  posts,
  readTimeLabel,
}: {
  locale: Locale;
  posts: HomeFeedPost[];
  readTimeLabel: (minutes: number) => string;
}) {
  if (!posts.length) {
    return (
      <section className="home-feed container">
        <p className="home-feed-empty">No published posts yet.</p>
      </section>
    );
  }

  const [hero, ...rest] = posts;
  const mosaic = rest.slice(0, 8);
  const sizes = ["lg", "md", "sm", "md", "sm", "lg", "sm", "md"] as const;

  return (
    <section className="home-feed" aria-label="Latest posts">
      <Link
        href={localizedPath(locale, `/blog/${hero.slug}`)}
        className="home-banner"
      >
        <Media post={hero} className="home-banner-media" />
        <span className="home-banner-shade" aria-hidden="true" />
        <span className="home-banner-copy">
          <span className="home-banner-brand">fikraInAction</span>
          <span className="home-banner-title">{hero.title}</span>
          {hero.excerpt ? <span className="home-banner-excerpt">{hero.excerpt}</span> : null}
          <span className="home-banner-meta">{readTimeLabel(hero.readingTimeMinutes)}</span>
        </span>
      </Link>

      {mosaic.length > 0 ? (
        <div className="container home-mosaic">
          {mosaic.map((post, index) => {
            const size = sizes[index % sizes.length];
            return (
              <Link
                key={post.slug}
                href={localizedPath(locale, `/blog/${post.slug}`)}
                className={`home-tile home-tile-${size}`}
                style={{ animationDelay: `${0.06 * (index + 1)}s` }}
              >
                <Media post={post} className="home-tile-media" />
                <span className="home-tile-shade" aria-hidden="true" />
                <span className="home-tile-copy">
                  <span className="home-tile-meta">{readTimeLabel(post.readingTimeMinutes)}</span>
                  <span className="home-tile-title">{post.title}</span>
                  {size !== "sm" && post.excerpt ? (
                    <span className="home-tile-excerpt">{post.excerpt}</span>
                  ) : null}
                </span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
