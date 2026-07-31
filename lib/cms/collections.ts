/** Canonical and legacy Firestore collection names for fikraInAction. */

export const COLLECTIONS = {
  users: "users",
  posts: "posts",
  postLocales: "postLocales",
  postRevisions: "postRevisions",
  pages: "pages",
  categories: "categories",
  tags: "tags",
  comments: "comments",
  commentPrivateData: "commentPrivateData",
  media: "media",
  menus: "menus",
  homepageSections: "homepageSections",
  reusableBlocks: "reusableBlocks",
  affiliatePrograms: "affiliatePrograms",
  affiliateLinks: "affiliateLinks",
  redirects: "redirects",
  contactSubmissions: "contactSubmissions",
  newsletterSubscribers: "newsletterSubscribers",
  siteSettings: "siteSettings",
  auditLogs: "auditLogs",
  slugReservations: "slugReservations",
  aiBatches: "aiBatches",
  aiBatchItems: "aiBatchItems",
} as const;

/** Pre-migration collections — keep readable until verified. */
export const LEGACY_COLLECTIONS = {
  blogPosts: "blogPosts",
  landingPages: "landingPages",
  products: "products",
  affiliateClicks: "affiliateClicks",
  mediaAssets: "mediaAssets",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
