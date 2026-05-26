export interface ItemContent {
  title: string;
  description?: string;
  tags?: string;
  thumbnail?: string;
  demoUrl?: string;
}

export interface ItemPreview {
  title: string;
  slug: string;
  thumbnail: string;
  description: string;
  demoUrl?: string;
}
