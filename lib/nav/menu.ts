import type { MenuDoc, MenuItem } from "../types/cms";

/** Static chrome only — category dropdowns come from CMS categories. */
export function defaultHeaderMenu(): MenuDoc {
  return {
    id: "header",
    location: "header",
    updatedAt: new Date().toISOString(),
    items: [
      {
        id: "home",
        label: { ar: "الرئيسية", en: "Home" },
        href: "/",
        enabled: true,
        icon: "home",
      },
      {
        id: "blog",
        label: { ar: "المدونة", en: "Blog" },
        href: "/blog",
        enabled: true,
        icon: "blog",
      },
      {
        id: "about",
        label: { ar: "من نحن", en: "About" },
        href: "/about",
        enabled: true,
        icon: "about",
      },
    ],
  };
}

/**
 * Light cleanup for header items already merged with CMS categories in the layout.
 * Does not inject hardcoded category groups.
 */
export function normalizeHeaderMenu(menu?: MenuDoc | null): MenuItem[] {
  const source = (menu?.items ?? defaultHeaderMenu().items).filter(
    (item) => item.enabled !== false && item.id !== "search",
  );
  return source.map(withIcons);
}

function withIcons(item: MenuItem): MenuItem {
  return {
    ...item,
    icon: item.icon || item.id,
    children: item.children?.map(withIcons),
  };
}
