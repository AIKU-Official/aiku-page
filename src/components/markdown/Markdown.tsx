import type { ComponentProps, ElementType } from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkCjkFriendly from "remark-cjk-friendly";
import remarkGfm from "remark-gfm";

import { remarkBlockquoteBreaks } from "@/lib/markdown/plugins/remark-blockquote-breaks";
import { remarkFigures } from "@/lib/markdown/plugins/remark-figures";
import { remarkNoIndentedCode } from "@/lib/markdown/plugins/remark-no-indented-code";
import { isExternalUrl, markdownUrlTransform } from "@/lib/markdown/url";

import { MarkdownFigure } from "./MarkdownFigure";

const remarkPlugins = [
  remarkNoIndentedCode,
  remarkGfm,
  remarkCjkFriendly,
  remarkBlockquoteBreaks,
  remarkFigures,
];

// Headings are shifted one level down (# → h2) so they sit below the project
// title, as in the legacy renderer.
const heading = (Tag: ElementType) =>
  function ShiftedHeading({ node: _node, ...props }: ComponentProps<"h2"> & { node?: unknown }) {
    return <Tag {...props} />;
  };

const components: Components = {
  h1: heading("h2"),
  h2: heading("h3"),
  h3: heading("h4"),
  h4: heading("h5"),
  h5: heading("h6"),
  h6: heading("h6"),
  a: ({ node: _node, href, ...props }) =>
    href && isExternalUrl(href) ? (
      <a href={href} target="_blank" rel="noreferrer" {...props} />
    ) : (
      <a href={href} {...props} />
    ),
  table: ({ node: _node, ...props }) => (
    <div className="markdown-table">
      <table {...props} />
    </div>
  ),
  figure: ({ node: _node, ...props }) => <MarkdownFigure {...props} />,
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary author-provided images of unknown size
  img: ({ node: _node, alt, ...props }) => <img alt={alt ?? ""} loading="lazy" {...props} />,
};

/** Renders admin-authored project markdown. Raw HTML is not rendered. */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="markdown-body">
      <ReactMarkdown
        remarkPlugins={remarkPlugins}
        components={components}
        urlTransform={markdownUrlTransform}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
