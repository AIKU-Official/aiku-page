/**
 * Reads the admin's tag input into the list stored in `projects.tags`.
 * Accepts hash tags ("#NLP #RL #LLM") or a comma-separated list
 * ("NLP, RL, LLM"). A tag may contain spaces ("#Quantum Machine Learning"):
 * it runs until the next " #" or comma. Repeated tags are kept once.
 */
export function parseTags(input: string): string[] {
  const tags = input
    .split(/(?:^|[\s,]+)#|,/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return [...new Set(tags)];
}

/** Tags as the admin types them: ["NLP", "LLM"] -> "#NLP #LLM". */
export function formatTags(tags: string[]): string {
  return tags.map((tag) => `#${tag}`).join(" ");
}
