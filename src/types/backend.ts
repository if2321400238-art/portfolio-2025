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
