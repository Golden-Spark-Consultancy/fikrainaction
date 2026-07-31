import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  if (!items.length) return null;
  return (
    <nav className="breadcrumb page-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={`${item.label}-${index}`} className="breadcrumb-item">
            {index > 0 ? <span className="breadcrumb-sep" aria-hidden="true">/</span> : null}
            {item.href && !isLast ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <strong>{item.label}</strong>
            )}
          </span>
        );
      })}
    </nav>
  );
}
