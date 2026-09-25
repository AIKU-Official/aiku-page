import type { Data, Processor } from "unified";

type MicromarkData = Data & { micromarkExtensions?: unknown[] };

/**
 * Disables indented code blocks. Text pasted from Notion is often indented,
 * and the legacy renderer never treated indentation as code; fenced ``` code
 * blocks still work.
 */
export function remarkNoIndentedCode(this: Processor) {
  const data = this.data() as MicromarkData;
  const extensions = (data.micromarkExtensions ??= []);
  extensions.push({ disable: { null: ["codeIndented"] } });
}
