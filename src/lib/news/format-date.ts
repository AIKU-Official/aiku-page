/** "2026-09-26" → "2026.09.26"; other non-empty values are shown as-is. */
export function formatNewsDate(date: string | null | undefined): string {
  const value = String(date ?? "").trim();
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}.${match[2]}.${match[3]}` : value;
}
