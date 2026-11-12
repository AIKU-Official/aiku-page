// What the admin canvas may do with each table, in one place. Safe to import
// from client code. Every table in the public schema appears on the canvas;
// these rules only narrow what is shown or editable.

/** Tables whose rows hold secrets: drawn on the canvas, rows never sent to the browser. */
export const HIDDEN_ROW_TABLES = ["login_attempts", "member_student_ids"] as const;

/**
 * The canvas's own change history: never drawn on the canvas or edited from
 * it (the database refuses too). It is read in the 변경 기록 list instead.
 */
export const OFF_CANVAS_TABLES = ["admin_change_batches", "admin_change_log"] as const;

/** Columns uploaded to Storage rather than typed in: one file, or a list of files. */
export const STORAGE_COLUMNS: Record<
  string,
  Record<string, { many: boolean; kind: "image" | "presentation"; scope: "projects" | "members"; entity: string }>
> = {
  projects: {
    image_paths: { many: true, kind: "image", scope: "projects", entity: "id" },
    presentation_path: { many: false, kind: "presentation", scope: "projects", entity: "id" },
  },
  member_profiles: {
    avatar_path: { many: false, kind: "image", scope: "members", entity: "member_id" },
  },
};

/** Columns tried, in order, to label a row in pickers and lists. */
export const LABEL_COLUMNS = ["name", "title", "label", "email", "code"] as const;

/** Korean captions under the table names, and the groups that colour the canvas. */
export const TABLE_GROUPS: { label: string; tone: string; tables: Record<string, string> }[] = [
  {
    label: "회원",
    tone: "bg-green-50 text-green-800",
    tables: {
      generations: "기수",
      members: "회원",
      member_profiles: "프로필",
      member_positions: "직책",
      member_accounts: "로그인 연결",
      member_student_ids: "학번 해시",
      member_signup_requests: "가입 요청",
    },
  },
  {
    label: "프로젝트",
    tone: "bg-sky-100 text-sky-800",
    tables: {
      seasons: "분기",
      projects: "프로젝트",
      project_members: "참여자",
      tags: "분야 태그",
      project_tags: "프로젝트 태그",
    },
  },
  {
    label: "AIKUTHON",
    tone: "bg-amber-100 text-amber-800",
    tables: {
      aikuthons: "대회",
      aikuthon_awards: "수상",
      aikuthon_award_members: "수상자",
      aikuthon_partners: "주관·후원",
      aikuthon_tracks: "트랙",
      aikuthon_tags: "대회 태그",
    },
  },
  {
    label: "출결·상벌점",
    tone: "bg-violet-100 text-violet-800",
    tables: {
      activity_sessions: "회차",
      attendance: "출결",
      point_rules: "점수표",
      point_events: "상벌점",
      point_event_members: "상벌점 대상",
      member_point_entries: "상벌점 내역 (계산)",
    },
  },
  {
    label: "사이트",
    tone: "bg-surface-soft text-body",
    tables: { news: "소식", login_attempts: "로그인 시도" },
  },
];

export function tableGroup(table: string) {
  return TABLE_GROUPS.find((group) => table in group.tables) ?? TABLE_GROUPS.at(-1)!;
}

export const tableCaption = (table: string) => tableGroup(table).tables[table] ?? "";

export const rowsHidden = (table: string) => (HIDDEN_ROW_TABLES as readonly string[]).includes(table);
