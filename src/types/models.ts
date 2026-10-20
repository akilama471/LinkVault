export interface Bookmark {
  id: number;
  url: string;
  title: string | null;
  description: string | null;
  domain_id: number | null;
  thumbnail_path: string | null;
  preview_path: string | null;
  is_favorite: boolean;
  is_important: boolean;
  notes: string | null;
  hide_mode?: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Domain {
  id: number;
  domain: string;
  display_name?: string | null;
  favicon_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface Collection {
  id: number;
  name: string;
  description: string | null;
  bookmark_count?: number;
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}
