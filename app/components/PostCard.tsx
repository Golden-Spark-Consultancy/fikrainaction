import Image from "next/image";
import Link from "next/link";

export type PostCardProps = {
  href: string;
  title: string;
  thumbnailUrl?: string | null;
  thumbnailAlt?: string | null;
  excerpt?: string | null;
  meta?: string | null;
  readMoreLabel?: string;
};

/**
 * Shared post grid card: title + thumbnail, or brand logo on navy when missing.
 */
export function PostCard({
  href,
  title,
  thumbnailUrl,
  thumbnailAlt,
  excerpt,
  meta,
  readMoreLabel,
}: PostCardProps) {
  const hasThumb = Boolean(thumbnailUrl && String(thumbnailUrl).trim());

  return (
    <article className="post-card">
      <Link className="post-card-media" href={href} aria-hidden="true" tabIndex={-1}>
        {hasThumb ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="post-card-thumb"
            src={String(thumbnailUrl)}
            alt={thumbnailAlt || title}
            loading="lazy"
          />
        ) : (
          <span className="post-card-fallback" aria-hidden="true">
            <Image
              src="/fikra-in-action-logo.png"
              alt=""
              width={160}
              height={160}
              unoptimized
              className="post-card-fallback-logo"
            />
          </span>
        )}
      </Link>
      <div className="post-content">
        {meta ? <p className="micro-label">{meta}</p> : null}
        <h3 className="post-card-title">
          <Link href={href}>{title}</Link>
        </h3>
        {excerpt ? <p className="post-card-excerpt">{excerpt}</p> : null}
        {readMoreLabel ? (
          <Link className="post-card-more" href={href}>
            {readMoreLabel}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
