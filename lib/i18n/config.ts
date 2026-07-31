import {
  DEFAULT_LOCALE,
  FALLBACK_LOCALE,
  LOCALES,
  type Locale,
  type Permission,
  type UserRole,
} from "../types/cms";

export { DEFAULT_LOCALE, FALLBACK_LOCALE, LOCALES };
export type { Locale };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function resolveLocale(value?: string | null): Locale {
  if (value && isLocale(value)) return value;
  return DEFAULT_LOCALE;
}

export function localeDirection(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function localeHtmlLang(locale: Locale): string {
  return locale;
}

export function alternateLocale(locale: Locale): Locale {
  return locale === "ar" ? "en" : "ar";
}

/** Public site URL helpers — keep brand casing exact. */
export const BRAND_NAME = "fikraInAction";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://fikrainaction.com";

export function localizedPath(locale: Locale, path = ""): string {
  const clean = path.startsWith("/") ? path : `/${path}`;
  if (clean === "/") return `/${locale}`;
  return `/${locale}${clean}`;
}

export function stripLocalePrefix(pathname: string): { locale: Locale | null; path: string } {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (first && isLocale(first)) {
    const rest = "/" + segments.slice(1).join("/");
    return { locale: first, path: rest === "/" ? "/" : rest };
  }
  return { locale: null, path: pathname || "/" };
}

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    "manage_roles",
    "manage_settings",
    "view_audit_logs",
    "manage_users",
    "manage_content",
    "publish_content",
    "edit_own_content",
    "manage_media",
    "manage_comments",
    "manage_affiliates",
    "manage_navigation",
    "manage_pages",
    "import_export",
  ],
  administrator: [
    "manage_settings",
    "view_audit_logs",
    "manage_users",
    "manage_content",
    "publish_content",
    "edit_own_content",
    "manage_media",
    "manage_comments",
    "manage_affiliates",
    "manage_navigation",
    "manage_pages",
    "import_export",
  ],
  editor: [
    "manage_content",
    "publish_content",
    "edit_own_content",
    "manage_media",
    "manage_comments",
    "manage_pages",
  ],
  author: ["edit_own_content", "manage_media"],
  moderator: ["manage_comments"],
};

export function permissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}

export function normalizeArabicSearchText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىي]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .toLowerCase()
    .trim();
}

export function readingTimeMinutes(text: string, locale: Locale): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wpm = locale === "ar" ? 180 : 220;
  return Math.max(1, Math.ceil(words / wpm));
}
