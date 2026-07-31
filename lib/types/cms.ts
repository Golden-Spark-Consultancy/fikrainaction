/** Shared CMS domain types for fikraInAction. */

export const LOCALES = ["ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";
export const FALLBACK_LOCALE: Locale = "en";

export const CONTENT_STATUSES = [
  "draft",
  "in_review",
  "scheduled",
  "published",
  "archived",
] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const USER_ROLES = [
  "owner",
  "administrator",
  "editor",
  "author",
  "moderator",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const COMMENT_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "spam",
  "trash",
] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export type LocalizedString = Partial<Record<Locale, string>>;

export type SeoFields = {
  title?: string;
  description?: string;
  socialTitle?: string;
  socialDescription?: string;
  noIndex?: boolean;
};

export type PostShared = {
  id: string;
  authorId: string;
  thumbnailMediaId?: string;
  thumbnailUrl?: string;
  categoryIds: string[];
  tagIds: string[];
  featured: boolean;
  pinned?: boolean;
  homepagePlacement?: number | null;
  commentsEnabled?: boolean | null;
  isAffiliateContent: boolean;
  affiliateDisclosureOverride?: LocalizedString;
  relatedPostIds: string[];
  sources?: { title: string; publisher?: string; url: string; accessedAt: string }[];
  canonicalUrl?: string;
  aiGenerated?: boolean;
  aiBatchId?: string;
  aiWarnings?: string[];
  suggestedCategory?: string;
  missingFeaturedImage?: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
};

export type PostLocale = {
  id: string;
  postId: string;
  locale: Locale;
  title: string;
  slug: string;
  excerpt: string;
  /** TipTap JSON document */
  content: Record<string, unknown> | null;
  /** Sanitized HTML derived from content (or legacy HTML) */
  renderedHtml: string;
  /** Plain text for search */
  searchText: string;
  seo: SeoFields;
  thumbnailAlt?: string;
  caption?: string;
  status: ContentStatus;
  publishedAt?: string | null;
  scheduledAt?: string | null;
  lastReviewedAt?: string | null;
  readingTimeMinutes: number;
  updatedAt: string;
  updatedBy: string;
};

export type PageDoc = {
  id: string;
  locales: Partial<
    Record<
      Locale,
      {
        title: string;
        slug: string;
        excerpt?: string;
        content: Record<string, unknown> | null;
        renderedHtml: string;
        seo: SeoFields;
        status: ContentStatus;
        publishedAt?: string | null;
      }
    >
  >;
  template?: string;
  createdAt: string;
  updatedAt: string;
};

export type CategoryDoc = {
  id: string;
  parentId?: string | null;
  order: number;
  thumbnailMediaId?: string;
  locales: Partial<
    Record<
      Locale,
      {
        name: string;
        slug: string;
        description?: string;
        seo?: SeoFields;
      }
    >
  >;
  createdAt: string;
  updatedAt: string;
};

export type TagDoc = {
  id: string;
  locales: Partial<
    Record<
      Locale,
      {
        name: string;
        slug: string;
        description?: string;
      }
    >
  >;
  createdAt: string;
  updatedAt: string;
};

export type MediaDoc = {
  id: string;
  name: string;
  objectPath: string;
  contentType: string;
  size: number;
  url: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
  alt: LocalizedString;
  caption: LocalizedString;
  credit?: string;
  uploadedBy: string;
  uploadedAt: string;
  optimizedUrl?: string;
  thumbUrl?: string;
  hash?: string;
  usageRefs?: string[];
  updatedAt?: string;
  updatedBy?: string;
};

export type MenuItem = {
  id: string;
  label: LocalizedString;
  href?: string;
  external?: boolean;
  enabled: boolean;
  /** Optional icon key rendered next to the label in the navbar. */
  icon?: string;
  children?: MenuItem[];
};

export type MenuDoc = {
  id: string;
  location: "header" | "footer";
  items: MenuItem[];
  updatedAt: string;
};

export type HomepageSection = {
  id: string;
  type: string;
  enabled: boolean;
  order: number;
  heading: LocalizedString;
  config: Record<string, unknown>;
};

export type AffiliateLinkDoc = {
  id: string;
  programId?: string;
  shortCode: string;
  name: string;
  destinationUrl: string;
  active: boolean;
  expiresAt?: string | null;
  labels: LocalizedString;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
};

export type AffiliateProgramDoc = {
  id: string;
  name: string;
  network?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommentPublic = {
  id: string;
  postId: string;
  parentId?: string | null;
  displayName: string;
  body: string;
  status: CommentStatus;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
};

export type UserProfile = {
  uid: string;
  email: string;
  displayName: LocalizedString;
  bio: LocalizedString;
  role: UserRole;
  avatarMediaId?: string;
  createdAt: string;
  updatedAt: string;
};

export type SiteSettings = {
  defaultLocale: Locale;
  siteName: string;
  siteUrl: string;
  siteDescription?: LocalizedString;
  commentsEnabled: boolean;
  commentsRequireModeration: boolean;
  commentsCloseAfterDays?: number | null;
  commentsAllowReplies: boolean;
  analyticsEnabled: boolean;
  marketingEnabled: boolean;
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor?: string;
    accentColor?: string;
  };
  socialLinks: Record<string, string>;
  seoDefaults?: {
    titleTemplate?: LocalizedString;
    defaultMetaDescription?: LocalizedString;
    defaultOgImageUrl?: string;
  };
  affiliateDisclosure?: LocalizedString;
  postsPerPage?: number;
  defaultFeaturedImageUrl?: string;
  youtubeEmbedsEnabled?: boolean;
  aiSettings?: {
    maxPostsPerBatch?: number;
    defaultLanguage?: "ar" | "en" | "both";
    defaultStyle?: string;
  };
  analytics?: {
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
  };
  notificationEmail?: string;
  updatedAt: string;
};

export type AiBatchStatus =
  | "queued"
  | "researching"
  | "generating"
  | "completed"
  | "failed"
  | "cancelled";

export type AiBatchItemStatus = AiBatchStatus;

export type AiBatch = {
  id: string;
  topics: string[];
  language: "ar" | "en" | "both";
  style: string;
  audience: string;
  length: "short" | "medium" | "long";
  includeRecommendations: boolean;
  maxPosts: number;
  status: AiBatchStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  completedCount: number;
  failedCount: number;
  totalCount: number;
};

export type AiBatchItem = {
  id: string;
  batchId: string;
  topic: string;
  status: AiBatchItemStatus;
  postId?: string;
  locale?: Locale;
  sources?: { title: string; publisher?: string; url: string; accessedAt: string }[];
  warnings?: string[];
  error?: string;
  categoryId?: string;
  suggestedCategory?: string;
  tagIds?: string[];
  featuredImageStatus?: "ready" | "missing" | "placeholder";
  languageStatus?: string;
  createdAt: string;
  updatedAt: string;
};

export type RedirectDoc = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: 301 | 302;
  createdAt: string;
};

export type SlugReservation = {
  id: string;
  collection: string;
  documentId: string;
  locale: Locale;
  slug: string;
  createdAt: string;
};

export type AuditLogEntry = {
  id: string;
  actorUid: string;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

/** Capability matrix keys used by server + UI gates. */
export type Permission =
  | "manage_roles"
  | "manage_settings"
  | "view_audit_logs"
  | "manage_users"
  | "manage_content"
  | "publish_content"
  | "edit_own_content"
  | "manage_media"
  | "manage_comments"
  | "manage_affiliates"
  | "manage_navigation"
  | "manage_pages"
  | "manage_ai_generation"
  | "import_export";
