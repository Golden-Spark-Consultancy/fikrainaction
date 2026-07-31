import { z } from "zod";
import { CONTENT_STATUSES, LOCALES, USER_ROLES, COMMENT_STATUSES } from "../types/cms";

export const localeSchema = z.enum(LOCALES);
export const contentStatusSchema = z.enum(CONTENT_STATUSES);
export const userRoleSchema = z.enum(USER_ROLES);
export const commentStatusSchema = z.enum(COMMENT_STATUSES);

export const seoSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(320).optional(),
  socialTitle: z.string().max(120).optional(),
  socialDescription: z.string().max(320).optional(),
  noIndex: z.boolean().optional(),
});

export const localizedStringSchema = z.object({
  ar: z.string().max(2000).optional(),
  en: z.string().max(2000).optional(),
});

export const postLocaleInputSchema = z.object({
  locale: localeSchema,
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, "Slug must be URL-safe"),
  excerpt: z.string().max(500).default(""),
  content: z.record(z.string(), z.unknown()).nullable(),
  renderedHtml: z.string().max(1_500_000).optional(),
  seo: seoSchema.default({}),
  thumbnailAlt: z.string().max(200).optional(),
  caption: z.string().max(400).optional(),
  status: contentStatusSchema.default("draft"),
  publishedAt: z.string().datetime().nullable().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const postSharedInputSchema = z.object({
  authorId: z.string().min(1),
  thumbnailMediaId: z.string().optional(),
  categoryIds: z.array(z.string()).default([]),
  tagIds: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  homepagePlacement: z.number().int().nullable().optional(),
  commentsEnabled: z.boolean().nullable().optional(),
  isAffiliateContent: z.boolean().default(false),
  relatedPostIds: z.array(z.string()).default([]),
});

export const commentSubmitSchema = z.object({
  postId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  displayName: z.string().min(2).max(80),
  email: z.string().email().optional().or(z.literal("")),
  body: z.string().min(2).max(4000),
  locale: localeSchema,
  policyAccepted: z.literal(true),
  honeypot: z.string().max(0).optional(),
});

export const contactSubmitSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  subject: z.string().min(2).max(200),
  message: z.string().min(10).max(5000),
  consent: z.literal(true),
  locale: localeSchema,
  honeypot: z.string().max(0).optional(),
});

export const newsletterSubmitSchema = z.object({
  email: z.string().email(),
  locale: localeSchema,
  consent: z.literal(true),
  honeypot: z.string().max(0).optional(),
});

export const affiliateLinkSchema = z.object({
  shortCode: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i),
  name: z.string().min(1).max(160),
  destinationUrl: z.string().url(),
  active: z.boolean().default(true),
  expiresAt: z.string().datetime().nullable().optional(),
  programId: z.string().optional(),
  labels: localizedStringSchema.default({}),
});

export const roleAssignSchema = z.object({
  uid: z.string().min(1),
  role: userRoleSchema,
});
