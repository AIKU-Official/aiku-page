/**
 * Splits a project's field tags ("#NLP #RL #LLM") into ["NLP", "RL", "LLM"].
 * A tag may contain spaces ("#Quantum Machine Learning"); it runs until the
 * next " #". Returns null when the summary is plain text rather than tags.
 */
export function parseTags(summary: string): string[] | null {
  const value = summary.trim();
  if (!value.startsWith("#")) {
    return null;
  }
  const tags = value
    .split(/(?:^|\s+)#/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? tags : null;
}
