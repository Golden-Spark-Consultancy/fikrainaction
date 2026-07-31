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
    ],
  };
}

/**
 * Light cleanup for header items already merged with CMS categories in the layout.
 * Does not inject hardcoded category groups.
 */
export function normalizeHeaderMenu(menu?: MenuDoc | null): MenuItem[] {
  const source = (menu?.items ?? defaultHeaderMenu().items).filter(
    (item) =>
      item.enabled !== false &&
      item.id !== "search" &&
      item.id !== "blog" &&
      item.id !== "about" &&
      item.href !== "/blog" &&
      item.href !== "/about",
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
