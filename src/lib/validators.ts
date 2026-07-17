import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
});

export const feedbackSchema = z.object({
  docId: z.coerce.number().int().positive(),
  rating: z.union([z.literal(1), z.literal(-1)]),
  comment: z.string().max(1000).optional().default(""),
});

export const docSchema = z.object({
  title: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(250),
  description: z.string().trim().max(300).default(""),
  content: z.string().max(500_000).default(""),
  categoryId: z.number().int().positive().nullable(),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  message: z.string().trim().max(200).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(100),
  slug: z.string().trim().min(1).max(120),
  icon: z.string().trim().max(10).default("📄"),
});

export const aiSchema = z.object({
  action: z.enum(["write", "improve", "outline", "faq", "troubleshoot", "chat"]),
  topic: z.string().trim().max(500).default(""),
  content: z.string().max(100_000).default(""),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(20_000) }))
    .max(20)
    .optional(),
});
