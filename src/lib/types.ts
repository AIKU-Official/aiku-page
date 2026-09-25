// App-facing content types (camelCase). Rows from Supabase are converted in
// lib/data/mappers.ts. File fields hold Storage object paths inside the
// aiku-uploads bucket; build URLs with lib/storage/public-url.ts.

export type Season = {
  id: string;
  name: string;
};

export type Project = {
  id: string;
  seasonId: string;
  /** Season name, e.g. "26-1" (legacy `period`). */
  period: string;
  title: string;
  /** Field tags such as "#NLP #LLM". */
  summary: string;
  markdown: string;
  githubUrl: string | null;
  presentationPath: string | null;
  presentationName: string | null;
  imagePaths: string[];
};

export type NewsItem = {
  id: string;
  /** ISO date (YYYY-MM-DD) or null. */
  date: string | null;
  title: string;
  summary: string;
  linkUrl: string | null;
  linkLabel: string;
};

export type GalleryItem = {
  id: string;
  category: string;
  title: string;
  description: string;
  imagePath: string | null;
};

export type Member = {
  id: string;
  generationId: string;
  name: string;
  summary: string;
  email: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  photoPath: string | null;
};

export type Generation = {
  id: string;
  name: string;
  members: Member[];
};
