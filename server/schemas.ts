import { z } from "zod";

const tagValues = [
  "three",
  "websockets",
  "react",
  "redis",
  "gray",
  "html",
  "css",
  "javascript",
  "node",
  "next",
  "kubernetes",
  "postgresql",
  "ogl",
  "glsl",
] as const;

export const tagSchema = z.enum(tagValues);
export const themeSchema = z.enum(["light", "dark"]);
export const mediaKindSchema = z.enum(["image", "video"]);
export const componentKindSchema = z.enum(["media", "text", "imageText", "list"]);

export const mediaComponentSchema = z.object({
  type: z.literal("media"),
  props: z.object({
    type: mediaKindSchema,
    src: z.string().min(1),
    alt: z.string().optional(),
    caption: z.string().optional(),
  }),
});

export const textComponentSchema = z.object({
  type: z.literal("text"),
  props: z.object({
    title: z.string().optional(),
    text: z.string().min(1),
  }),
});

export const imageTextComponentSchema = z.object({
  type: z.literal("imageText"),
  props: z.object({
    imagePosition: z.enum(["left", "right"]),
    src: z.string().min(1),
    alt: z.string().optional(),
    border: z.boolean().optional(),
    component: z.unknown().optional(),
  }),
});

export const listComponentSchema = z.object({
  type: z.literal("list"),
  props: z.object({
    title: z.string().optional(),
    items: z.array(z.string().min(1)).min(1),
    size: z.enum(["sm", "md", "lg"]).optional(),
  }),
});

export const projectComponentSchema = z.discriminatedUnion("type", [
  mediaComponentSchema,
  textComponentSchema,
  imageTextComponentSchema,
  listComponentSchema,
]);

export const projectBodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  title: z.string().min(1).max(120),
  theme: themeSchema,
  tags: z.array(tagSchema).min(1).max(8),
  description: z.string().optional(),
  videoBorder: z.boolean().optional(),
  live: z.string().url().optional().or(z.literal("")),
  source: z.string().url().optional().or(z.literal("")),
  thumbnail: z.string().min(1).optional().or(z.literal("")),
  components: z.array(projectComponentSchema).optional(),
});

export const patchProjectBodySchema = projectBodySchema.partial().extend({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case")
    .optional(),
});

export const storedProjectSchema = projectBodySchema.extend({
  id: z.string().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const uploadResponseSchema = z.object({
  url: z.string().min(1),
});

export type ProjectBodyInput = z.infer<typeof projectBodySchema>;
export type PatchProjectBodyInput = z.infer<typeof patchProjectBodySchema>;
export type ProjectComponentInput = z.infer<typeof projectComponentSchema>;
