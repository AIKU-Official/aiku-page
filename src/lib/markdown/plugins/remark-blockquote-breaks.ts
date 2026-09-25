import type { Blockquote, PhrasingContent, Root } from "mdast";
import { SKIP, visit } from "unist-util-visit";

/**
 * Keeps the line breaks of a quote as typed (legacy joined `>` lines with
 * <br />) instead of CommonMark's soft wrapping into one line.
 */
export function remarkBlockquoteBreaks() {
  return (tree: Root) => {
    visit(tree, "blockquote", (quote: Blockquote) => {
      visit(quote, "text", (node, index, parent) => {
        if (!parent || index === undefined || !node.value.includes("\n")) {
          return;
        }

        const replacement: PhrasingContent[] = [];
        node.value.split("\n").forEach((part, partIndex) => {
          if (partIndex > 0) {
            replacement.push({ type: "break" });
          }
          if (part) {
            replacement.push({ type: "text", value: part });
          }
        });

        (parent.children as PhrasingContent[]).splice(index, 1, ...replacement);
        return [SKIP, index + replacement.length];
      });
    });
  };
}
