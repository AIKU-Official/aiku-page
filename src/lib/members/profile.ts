import type { MemberGrade } from "@/lib/types";

// Member-written profile (table member_profiles). Safe to import from client code.

export type ProfileInterest = { title: string; description: string };
export type ProfileSkill = { label: string; items: string };
export type ProfileExperience = { period: string; title: string; organization: string };

export type MemberProfile = {
  /** Visible to visitors only when true. */
  isPublic: boolean;
  headline: string;
  tagline: string;
  bio: string;
  avatarPath: string | null;
  contactEmail: string | null;
  githubUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  websiteUrl: string | null;
  focus: string[];
  interests: ProfileInterest[];
  skills: ProfileSkill[];
  experience: ProfileExperience[];
};

/** The roster facts shown next to a profile; members cannot edit these. */
export type ProfileSubject = {
  id: string;
  name: string;
  generation: string;
  department: string;
  grade: MemberGrade;
  position: string;
};

/** A project the member took part in; comes from the project records, not from the member. */
export type ProfileProject = {
  id: string;
  title: string;
  season: string;
  role: "leader" | "member";
  awardRank: 1 | 2 | 3 | null;
  /** The project's one-line summary; "" when it has none. */
  oneLine: string;
};

/** A 1st to 3rd place the member won at an AIKUTHON; comes from the award records. */
export type ProfileAward = {
  /** Fragment of the event's card on /aikuthon, e.g. "aikuthon-13". */
  anchor: string;
  event: string;
  /** What the event asked for (its task title); "" when not recorded. */
  task: string;
  /** "2026.08". */
  month: string;
  rank: 1 | 2 | 3;
  teamName: string;
};

export const emptyProfile: MemberProfile = {
  isPublic: false,
  headline: "",
  tagline: "",
  bio: "",
  avatarPath: null,
  contactEmail: null,
  githubUrl: null,
  instagramUrl: null,
  linkedinUrl: null,
  websiteUrl: null,
  focus: [],
  interests: [],
  skills: [],
  experience: [],
};

export const PROFILE_LIMITS = { focus: 8, interests: 6, skills: 8, experience: 12 } as const;
export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

const str = (value: unknown) => (typeof value === "string" ? value : "");

/** Reads a JSON list column defensively: anything malformed is dropped. */
function list<T>(value: unknown, read: (entry: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
    )
    .map(read);
}

type ProfileRow = {
  is_public: boolean;
  headline: string;
  tagline: string;
  bio: string;
  avatar_path: string | null;
  contact_email: string | null;
  github_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
  focus: string[];
  interests: unknown;
  skills: unknown;
  experience: unknown;
};

export const mapProfile = (row: ProfileRow): MemberProfile => ({
  isPublic: row.is_public,
  headline: row.headline,
  tagline: row.tagline,
  bio: row.bio,
  avatarPath: row.avatar_path,
  contactEmail: row.contact_email,
  githubUrl: row.github_url,
  instagramUrl: row.instagram_url,
  linkedinUrl: row.linkedin_url,
  websiteUrl: row.website_url,
  focus: row.focus,
  interests: list(row.interests, (e) => ({
    title: str(e.title),
    description: str(e.description),
  })),
  skills: list(row.skills, (e) => ({ label: str(e.label), items: str(e.items) })),
  experience: list(row.experience, (e) => ({
    period: str(e.period),
    title: str(e.title),
    organization: str(e.organization),
  })),
});

const LINK_HOSTS = {
  github: "https://github.com/",
  instagram: "https://www.instagram.com/",
  linkedin: "https://www.linkedin.com/in/",
} as const;

export type LinkKind = keyof typeof LINK_HOSTS | "website";

/**
 * Turns what a member typed into a full link. A bare handle ("@chan" or
 * "chan") becomes the profile URL of that service; an address without a
 * scheme gets https://. Returns "" for empty input.
 */
export function normalizeLink(kind: LinkKind, input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (kind !== "website" && /^@?[A-Za-z0-9._-]+$/.test(value)) {
    return `${LINK_HOSTS[kind]}${value.replace(/^@/, "")}`;
  }
  return `https://${value}`;
}
