import type { LocalizedString, MenuDoc, MenuItem } from "../types/cms";

type GroupDef = {
  id: string;
  label: LocalizedString;
  icon: string;
  href?: string;
  childIds: string[];
};

/** Top-level category groups shown in the navbar. */
export const NAV_CATEGORY_GROUPS: GroupDef[] = [
  {
    id: "ai-automation",
    label: { ar: "الذكاء والأتمتة", en: "AI & Automation" },
    icon: "ai",
    href: "/category/artificial-intelligence",
    childIds: ["ai", "automation"],
  },
  {
    id: "software-group",
    label: { ar: "البرمجيات", en: "Software" },
    icon: "software",
    href: "/category/software",
    childIds: ["software", "programming"],
  },
  {
    id: "hardware-group",
    label: { ar: "الأجهزة", en: "Hardware" },
    icon: "hardware",
    href: "/category/hardware",
    childIds: ["hardware", "arduino", "rpi", "esp32"],
  },
  {
    id: "guides",
    label: { ar: "شروحات ومراجعات", en: "Guides & Reviews" },
    icon: "guides",
    href: "/category/tutorials",
    childIds: ["tutorials", "reviews"],
  },
];

const CATEGORY_ITEM_DEFS: Record<string, MenuItem> = {
  ai: {
    id: "ai",
    label: { ar: "الذكاء الاصطناعي", en: "Artificial Intelligence" },
    href: "/category/artificial-intelligence",
    enabled: true,
    icon: "ai",
  },
  automation: {
    id: "automation",
    label: { ar: "الأتمتة", en: "Automation" },
    href: "/category/automation",
    enabled: true,
    icon: "automation",
  },
  software: {
    id: "software",
    label: { ar: "البرمجيات", en: "Software" },
    href: "/category/software",
    enabled: true,
    icon: "software",
  },
  programming: {
    id: "programming",
    label: { ar: "البرمجة", en: "Programming" },
    href: "/category/programming",
    enabled: true,
    icon: "programming",
  },
  hardware: {
    id: "hardware",
    label: { ar: "الأجهزة", en: "Hardware" },
    href: "/category/hardware",
    enabled: true,
    icon: "hardware",
  },
  arduino: {
    id: "arduino",
    label: { ar: "أردوينو", en: "Arduino" },
    href: "/category/arduino",
    enabled: true,
    icon: "arduino",
  },
  rpi: {
    id: "rpi",
    label: { ar: "راسبيري باي", en: "Raspberry Pi" },
    href: "/category/raspberry-pi",
    enabled: true,
    icon: "raspberry-pi",
  },
  esp32: {
    id: "esp32",
    label: { ar: "ESP32", en: "ESP32" },
    href: "/category/esp32",
    enabled: true,
    icon: "esp32",
  },
  tutorials: {
    id: "tutorials",
    label: { ar: "شروحات", en: "Tutorials" },
    href: "/category/tutorials",
    enabled: true,
    icon: "tutorials",
  },
  reviews: {
    id: "reviews",
    label: { ar: "مراجعات", en: "Reviews" },
    href: "/category/reviews",
    enabled: true,
    icon: "reviews",
  },
};

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
      ...NAV_CATEGORY_GROUPS.map((group) => ({
        id: group.id,
        label: group.label,
        href: group.href,
        enabled: true,
        icon: group.icon,
        children: group.childIds
          .map((id) => CATEGORY_ITEM_DEFS[id])
          .filter(Boolean),
      })),
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
 * Normalize a header menu: regroup flat category links into typed dropdowns,
 * drop standalone Search links, and ensure icons are present.
 */
export function normalizeHeaderMenu(menu?: MenuDoc | null): MenuItem[] {
  const source = (menu?.items ?? defaultHeaderMenu().items).filter(
    (item) => item.enabled !== false && item.id !== "search",
  );

  const byId = new Map(source.map((item) => [item.id, item]));
  const alreadyGrouped = source.some(
    (item) => Array.isArray(item.children) && item.children.length > 0,
  );

  if (alreadyGrouped) {
    return source.map(withIcons);
  }

  const consumed = new Set<string>();
  const grouped: MenuItem[] = [];

  for (const group of NAV_CATEGORY_GROUPS) {
    const children = group.childIds
      .map((id) => byId.get(id) || CATEGORY_ITEM_DEFS[id])
      .filter((item): item is MenuItem => Boolean(item?.enabled !== false))
      .map(withIcons);
    children.forEach((child) => consumed.add(child.id));
    if (children.length) {
      grouped.push(
        withIcons({
          id: group.id,
          label: group.label,
          href: group.href,
          enabled: true,
          icon: group.icon,
          children,
        }),
      );
    }
  }

  const result: MenuItem[] = [];
  const insertedGroups = new Set<string>();

  for (const item of source) {
    if (consumed.has(item.id) || item.id === "search") continue;

    const belongsTo = NAV_CATEGORY_GROUPS.find((group) =>
      group.childIds.includes(item.id),
    );
    if (belongsTo) continue;

    // Insert category groups after Home (or at the start of category area).
    if (
      (item.id === "blog" || item.id === "about") &&
      insertedGroups.size === 0
    ) {
      for (const group of grouped) {
        result.push(group);
        insertedGroups.add(group.id);
      }
    }

    result.push(withIcons(item));
  }

  if (insertedGroups.size === 0) {
    const homeIndex = result.findIndex((item) => item.id === "home");
    const at = homeIndex >= 0 ? homeIndex + 1 : 0;
    result.splice(at, 0, ...grouped);
  }

  // Ensure Blog is present even if the stored menu omitted it.
  if (!result.some((item) => item.id === "blog" || item.href === "/blog")) {
    result.push(
      withIcons({
        id: "blog",
        label: { ar: "المدونة", en: "Blog" },
        href: "/blog",
        enabled: true,
        icon: "blog",
      }),
    );
  }

  return result;
}

function withIcons(item: MenuItem): MenuItem {
  return {
    ...item,
    icon: item.icon || item.id,
    children: item.children?.map(withIcons),
  };
}
