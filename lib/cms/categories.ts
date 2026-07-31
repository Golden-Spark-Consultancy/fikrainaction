import { getAdminFirestore } from "../firebase/admin";
import type { Locale } from "../i18n/config";
import type { CategoryDoc, MenuDoc, MenuItem } from "../types/cms";
import { COLLECTIONS } from "./collections";
import { NAV_TAXONOMY } from "./nav-taxonomy";
import { slugify } from "./slug";

function stripUndefined<T extends Record<string, unknown>>(value: T): T {
  const result = {} as T;
  for (const key of Object.keys(value) as (keyof T)[]) {
    if (value[key] !== undefined) result[key] = value[key];
  }
  return result;
}

export function normalizeCategory(id: string, data: Partial<CategoryDoc>): CategoryDoc {
  return {
    id,
    parentId: data.parentId ?? null,
    order: Number(data.order ?? 0),
    showInNav: data.showInNav !== false,
    icon: data.icon || id,
    enabled: data.enabled !== false,
    thumbnailMediaId: data.thumbnailMediaId,
    locales: data.locales || {},
    createdAt: String(data.createdAt || new Date().toISOString()),
    updatedAt: String(data.updatedAt || new Date().toISOString()),
  };
}

export async function listCategories(): Promise<CategoryDoc[]> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.categories).limit(500).get();
  const items = snap.docs.map((doc) =>
    normalizeCategory(doc.id, doc.data() as Partial<CategoryDoc>),
  );
  return items
    .filter((item) => item.enabled !== false)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

/** Categories for the public navbar; auto-syncs the canonical tree once if missing. */
export async function listCategoriesForNav(): Promise<CategoryDoc[]> {
  let items = await listCategories().catch(() => [] as CategoryDoc[]);
  const hasCanonicalTree = items.some((item) => item.id === "ai-automation");
  if (!hasCanonicalTree) {
    try {
      await ensureDefaultNavCategories();
      items = await listCategories();
    } catch {
      /* keep whatever we have if sync is unavailable */
    }
  }
  return items;
}

export async function listAllCategoriesAdmin(): Promise<CategoryDoc[]> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.categories).limit(500).get();
  return snap.docs
    .map((doc) => normalizeCategory(doc.id, doc.data() as Partial<CategoryDoc>))
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}

export async function getCategoryById(id: string): Promise<CategoryDoc | null> {
  const db = await getAdminFirestore();
  const snap = await db.collection(COLLECTIONS.categories).doc(id).get();
  if (!snap.exists) return null;
  return normalizeCategory(snap.id, snap.data() as Partial<CategoryDoc>);
}

export async function getCategoryBySlug(
  locale: Locale,
  slug: string,
): Promise<CategoryDoc | null> {
  const all = await listCategories();
  return (
    all.find((cat) => cat.locales[locale]?.slug === slug) ||
    all.find((cat) => cat.locales.en?.slug === slug || cat.locales.ar?.slug === slug) ||
    all.find((cat) => cat.id === slug) ||
    null
  );
}

export type CategoryInput = {
  id?: string;
  parentId?: string | null;
  order?: number;
  showInNav?: boolean;
  icon?: string;
  enabled?: boolean;
  nameAr?: string;
  nameEn?: string;
  slugAr?: string;
  slugEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
};

export async function upsertCategory(input: CategoryInput): Promise<CategoryDoc> {
  const nameAr = String(input.nameAr || "").trim();
  const nameEn = String(input.nameEn || "").trim();
  if (!nameAr && !nameEn) throw new Error("Name required in at least one language.");

  const db = await getAdminFirestore();
  const now = new Date().toISOString();
  const id =
    String(input.id || "").trim() ||
    slugify(nameEn || nameAr, "en") ||
    `category-${Date.now()}`;

  if (input.parentId && input.parentId === id) {
    throw new Error("A category cannot be its own parent.");
  }
  if (input.parentId) {
    const parent = await getCategoryById(input.parentId);
    if (!parent) throw new Error("Parent category not found.");
    if (parent.parentId) throw new Error("Only one subcategory level is supported.");
  }

  const existing = await getCategoryById(id);
  const slugAr = slugify(String(input.slugAr || nameAr || nameEn), "ar") || id;
  const slugEn = slugify(String(input.slugEn || nameEn || nameAr), "en") || id;

  const doc: CategoryDoc = {
    id,
    parentId: input.parentId ?? existing?.parentId ?? null,
    order: Number(input.order ?? existing?.order ?? 0),
    showInNav: input.showInNav ?? existing?.showInNav ?? true,
    icon: input.icon || existing?.icon || id,
    enabled: input.enabled ?? existing?.enabled ?? true,
    thumbnailMediaId: existing?.thumbnailMediaId,
    locales: {
      ar: {
        name: nameAr || nameEn,
        slug: slugAr,
        description: String(input.descriptionAr ?? existing?.locales.ar?.description ?? ""),
      },
      en: {
        name: nameEn || nameAr,
        slug: slugEn,
        description: String(input.descriptionEn ?? existing?.locales.en?.description ?? ""),
      },
    },
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await db.collection(COLLECTIONS.categories).doc(id).set(stripUndefined(doc as unknown as Record<string, unknown>), {
    merge: true,
  });
  return doc;
}

/**
 * Upsert the canonical navbar category tree into Firestore.
 * Safe to run repeatedly — merges hierarchy, labels, icons, and showInNav.
 */
export async function ensureDefaultNavCategories(): Promise<CategoryDoc[]> {
  const db = await getAdminFirestore();
  const now = new Date().toISOString();
  const batch = db.batch();

  for (const node of NAV_TAXONOMY) {
    const ref = db.collection(COLLECTIONS.categories).doc(node.id);
    batch.set(
      ref,
      {
        id: node.id,
        parentId: node.parentId,
        order: node.order,
        showInNav: node.showInNav,
        icon: node.icon,
        enabled: true,
        locales: {
          ar: {
            name: node.nameAr,
            slug: node.slugAr,
            description: node.descriptionAr || node.nameAr,
          },
          en: {
            name: node.nameEn,
            slug: node.slugEn,
            description: node.descriptionEn || node.nameEn,
          },
        },
        updatedAt: now,
      },
      { merge: true },
    );
  }

  // Hide legacy flat duplicates that would otherwise appear as extra top-level nav items.
  const legacyTopLevelHide = ["cybersecurity"];
  for (const id of legacyTopLevelHide) {
    batch.set(
      db.collection(COLLECTIONS.categories).doc(id),
      { showInNav: false, updatedAt: now },
      { merge: true },
    );
  }

  // Old rpi id → keep linked under hardware-group if present.
  batch.set(
    db.collection(COLLECTIONS.categories).doc("rpi"),
    {
      parentId: "hardware-group",
      showInNav: false,
      enabled: false,
      updatedAt: now,
    },
    { merge: true },
  );

  await batch.commit();
  return listAllCategoriesAdmin();
}

export async function deleteCategory(id: string): Promise<void> {
  const db = await getAdminFirestore();
  const children = (await listAllCategoriesAdmin()).filter((cat) => cat.parentId === id);
  if (children.length) {
    throw new Error("Move or delete subcategories before deleting this category.");
  }
  await db.collection(COLLECTIONS.categories).doc(id).delete();
}

function categoryHref(cat: CategoryDoc): string {
  const slug = cat.locales.en?.slug || cat.locales.ar?.slug || cat.id;
  return `/category/${slug}`;
}

function categoryLabel(cat: CategoryDoc) {
  return {
    ar: cat.locales.ar?.name || cat.locales.en?.name || cat.id,
    en: cat.locales.en?.name || cat.locales.ar?.name || cat.id,
  };
}

/** Build navbar category items from CMS categories (showInNav + hierarchy). */
export function buildCategoryMenuItems(categories: CategoryDoc[]): MenuItem[] {
  const visible = categories.filter((cat) => cat.enabled !== false && cat.showInNav !== false);
  const roots = visible
    .filter((cat) => !cat.parentId)
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

  return roots.map((root) => {
    const children = visible
      .filter((cat) => cat.parentId === root.id)
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
      .map(
        (child): MenuItem => ({
          id: child.id,
          label: categoryLabel(child),
          href: categoryHref(child),
          enabled: true,
          icon: child.icon || child.id,
        }),
      );

    return {
      id: root.id,
      label: categoryLabel(root),
      href: categoryHref(root),
      enabled: true,
      icon: root.icon || root.id,
      children: children.length ? children : undefined,
    };
  });
}

/**
 * Build the public header from CMS categories (showInNav + parent/child).
 * Static items stay Home / Blog / About only — categories never come from menu JSON.
 */
export function mergeCategoriesIntoHeaderMenu(
  menu: MenuDoc,
  categories: CategoryDoc[],
): MenuDoc {
  const categoryItems = buildCategoryMenuItems(categories);
  const source = (menu.items || []).filter((item) => item.enabled !== false);

  const home =
    source.find((item) => item.id === "home" || item.href === "/") ||
    ({
      id: "home",
      label: { ar: "الرئيسية", en: "Home" },
      href: "/",
      enabled: true,
      icon: "home",
    } satisfies MenuItem);

  const blog =
    source.find((item) => item.id === "blog" || item.href === "/blog") ||
    ({
      id: "blog",
      label: { ar: "المدونة", en: "Blog" },
      href: "/blog",
      enabled: true,
      icon: "blog",
    } satisfies MenuItem);

  const about =
    source.find((item) => item.id === "about" || item.href === "/about") ||
    ({
      id: "about",
      label: { ar: "من نحن", en: "About" },
      href: "/about",
      enabled: true,
      icon: "about",
    } satisfies MenuItem);

  return {
    ...menu,
    items: [home, ...categoryItems, blog, about],
  };
}
