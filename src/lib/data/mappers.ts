import type { Tables } from "@/lib/supabase/database.types";
import type { GalleryItem, Member, NewsItem, Project, Season } from "@/lib/types";

export const mapSeason = (row: Pick<Tables<"seasons">, "id" | "name">): Season => ({
  id: row.id,
  name: row.name,
});

export const mapProject = (row: Tables<"projects">, period: string): Project => ({
  id: row.id,
  seasonId: row.season_id,
  period,
  title: row.title,
  summary: row.summary,
  markdown: row.markdown,
  githubUrl: row.github_url,
  presentationPath: row.presentation_path,
  presentationName: row.presentation_name,
  imagePaths: row.image_paths,
});

export const mapNews = (row: Tables<"news">): NewsItem => ({
  id: row.id,
  date: row.published_on,
  title: row.title,
  summary: row.summary,
  linkUrl: row.link_url,
  linkLabel: row.link_label,
});

export const mapGalleryItem = (row: Tables<"gallery_items">): GalleryItem => ({
  id: row.id,
  category: row.category,
  title: row.title,
  description: row.description,
  imagePath: row.image_path,
});

export const mapMember = (row: Tables<"members">): Member => ({
  id: row.id,
  generationId: row.generation_id,
  name: row.name,
  summary: row.summary,
  email: row.email,
  githubUrl: row.github_url,
  linkedinUrl: row.linkedin_url,
  websiteUrl: row.website_url,
  photoPath: row.photo_path,
});
