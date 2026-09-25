import type { Image, PhrasingContent, Root, RootContent } from "mdast";

// Legacy behavior: a line that holds only an image becomes a <figure> with a
// caption (title, else alt text), and consecutive image lines — blank lines
// between them allowed — are laid out together in a div.markdown-gallery grid.

const isBlank = (node: PhrasingContent) =>
  node.type === "break" || (node.type === "text" && node.value.trim() === "");

function imagesOnly(node: RootContent): Image[] | null {
  if (node.type !== "paragraph") {
    return null;
  }

  const content = node.children.filter((child) => !isBlank(child));
  if (!content.length || !content.every((child) => child.type === "image")) {
    return null;
  }
  return content as Image[];
}

// mdast has no figure node; a paragraph renamed through `data.hName` is turned
// into the matching HTML element by remark-rehype.
function figure(image: Image): RootContent {
  const caption = image.title || image.alt;
  const children: unknown[] = [image];
  if (caption) {
    children.push({
      type: "paragraph",
      data: { hName: "figcaption" },
      children: [{ type: "text", value: caption }],
    });
  }
  return { type: "paragraph", data: { hName: "figure" }, children } as RootContent;
}

function gallery(figures: RootContent[]): RootContent {
  return {
    type: "paragraph",
    data: { hName: "div", hProperties: { className: ["markdown-gallery"] } },
    children: figures,
  } as RootContent;
}

export function remarkFigures() {
  return (tree: Root) => {
    const children: RootContent[] = [];
    let run: Image[] = [];

    const flush = () => {
      if (!run.length) {
        return;
      }
      const figures = run.map(figure);
      children.push(figures.length > 1 ? gallery(figures) : figures[0]);
      run = [];
    };

    for (const node of tree.children) {
      const images = imagesOnly(node);
      if (images) {
        run.push(...images);
        continue;
      }
      flush();
      children.push(node);
    }
    flush();

    tree.children = children;
  };
}
