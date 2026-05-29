import type { ProjectComponent } from "../features/projects/types";
import type { TagVariant } from "../components/tagVariants";

export interface BackendItemRecord {
  id: string;
  slug: string;
  title: string;
  description?: string;
  tags?: string;
  thumbnail?: string;
  demoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendItemInput {
  title: string;
  description?: string;
  tags?: string;
  thumbnail?: string;
  demoUrl?: string;
}

export interface BackendItemPreview {
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
  demoUrl?: string;
}

export interface BackendProjectRecord {
  id: string;
  slug: string;
  title: string;
  theme: "light" | "dark";
  tags: TagVariant[];
  description?: string;
  videoBorder?: boolean;
  live?: string;
  source?: string;
  thumbnail?: string;
  components?: ProjectComponent[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendProjectInput {
  slug: string;
  title: string;
  theme: "light" | "dark";
  tags: TagVariant[];
  description: string;
  videoBorder: boolean;
  live: string;
  source: string;
  thumbnail: string;
  components: ProjectComponent[];
}
