export const PROJECT_MARKDOWN_FALLBACK = "## 프로젝트 소개\n\n프로젝트 상세 소개가 곧 공개됩니다.";

/**
 * Normalizes pasted markdown: unifies line endings, expands tabs, trims blank
 * lines at both ends and removes the indentation shared by every line
 * (port of the legacy dedentMarkdown).
 */
export function dedentMarkdown(value: string): string {
  const lines = value.replace(/\r\n?/g, "\n").replaceAll("\t", "  ").split("\n");

  while (lines.length && lines[0].trim() === "") {
    lines.shift();
  }
  while (lines.length && lines[lines.length - 1].trim() === "") {
    lines.pop();
  }

  const indents = lines
    .filter((line) => line.trim() !== "")
    .map((line) => line.match(/^ */)?.[0].length ?? 0);
  const minIndent = indents.length ? Math.min(...indents) : 0;

  return lines.map((line) => line.slice(minIndent)).join("\n");
}

const escapeAlt = (value: string) => value.replace(/[[\]\\]/g, "\\$&");

/**
 * Builds the markdown shown on a project card: the description followed by
 * the separately uploaded images, or a placeholder when both are empty.
 */
export function composeProjectMarkdown({
  title,
  markdown,
  imagePaths,
}: {
  title: string;
  markdown: string;
  imagePaths: string[];
}): string {
  const imageMarkdown = imagePaths
    .filter(Boolean)
    .map((path, index) => `![${escapeAlt(title || "project")} ${index + 1}](<${path}>)`)
    .join("\n\n");
  const combined = [dedentMarkdown(markdown), imageMarkdown].filter(Boolean).join("\n\n");

  return combined || PROJECT_MARKDOWN_FALLBACK;
}
