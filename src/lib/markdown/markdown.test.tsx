import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { Markdown } from "@/components/markdown/Markdown";

import legacyProjects from "./__fixtures__/legacy-projects.json";
import { composeProjectMarkdown, dedentMarkdown, PROJECT_MARKDOWN_FALLBACK } from "./compose";

const render = (markdown: string) => renderToStaticMarkup(<Markdown>{markdown}</Markdown>);

describe("legacy project documents", () => {
  const quantum = render(legacyProjects["project-26-1-1"].markdown);
  const rice = render(legacyProjects["project-26-1-2"].markdown);

  it("shifts headings one level down", () => {
    expect(quantum).toContain("<h3>소개</h3>");
    expect(quantum).not.toContain("<h2>");
  });

  it("wraps tables for horizontal scrolling", () => {
    expect(quantum).toMatch(/<div class="markdown-table"><table>/);
    expect(rice.match(/class="markdown-table"/g)).toHaveLength(2);
  });

  it("groups consecutive images into a gallery", () => {
    const gallery = rice.match(/<div class="markdown-gallery">(.*?)<\/div>/s)?.[1] ?? "";
    expect(gallery.match(/<figure>/g)).toHaveLength(2);
    expect(gallery).toMatch(/<img [^>]*src="[^"]*pareto_retain\.png"/);
    expect(gallery).toContain("<figcaption>pareto-retained</figcaption>");
    expect(gallery).toMatch(/<img [^>]*src="[^"]*pareto_utility\.png"/);
  });

  it("keeps images separated by text as single figures", () => {
    expect(quantum).not.toContain("markdown-gallery");
    expect(quantum).toMatch(
      /<figure><img [^>]*\/><figcaption>color4match2<\/figcaption><\/figure>\s*<p>▲ color4match2<\/p>\s*<figure>/,
    );
  });

  it("renders bold text next to Korean characters", () => {
    expect(rice).toContain("<strong>NPO(Negative Preference Optimization)</strong>");
    expect(quantum).toContain("<strong>분산 QCNN (8큐비트, 4+4):</strong>");
  });
});

describe("Markdown", () => {
  it("keeps line breaks inside quotes", () => {
    expect(render("> 첫 줄\n> 둘째 줄")).toMatch(/<blockquote>\s*<p>첫 줄<br\/>\s*둘째 줄<\/p>/);
  });

  it("groups image lines without blank lines between them", () => {
    const html = render("![a](https://x.test/a.png)\n![b](https://x.test/b.png)");
    expect(html.match(/<figure>/g)).toHaveLength(2);
    expect(html).toContain('<div class="markdown-gallery">');
  });

  it("uses the image title as caption when present", () => {
    expect(render('![alt](https://x.test/a.png "제목")')).toContain(
      "<figcaption>제목</figcaption>",
    );
  });

  it("resolves uploaded Storage paths to public URLs", () => {
    expect(render("![x](projects/abc/image1.png)")).toMatch(
      /src="[^"]*\/storage\/v1\/object\/public\/aiku-uploads\/projects\/abc\/image1\.png"/,
    );
  });

  it("opens external links in a new tab", () => {
    expect(render("[GitHub](https://github.com/AIKU-Official)")).toContain(
      '<a href="https://github.com/AIKU-Official" target="_blank" rel="noreferrer">GitHub</a>',
    );
    expect(render("[프로젝트](/projects)")).toContain('<a href="/projects">프로젝트</a>');
  });

  it("drops unsafe URLs and raw HTML", () => {
    const html = render('[x](javascript:alert(1))\n\n<script>alert("x")</script>\n\n<b>bold</b>');
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<script");
    expect(html).not.toContain("<b>");
  });

  it("treats indented text as a paragraph, not code", () => {
    expect(render("문단\n\n    들여쓴 문단")).toContain("<p>들여쓴 문단</p>");
    expect(render("```\ncode\n```")).toContain("<pre><code>code\n</code></pre>");
  });

  it("renders nested lists", () => {
    expect(render("- a\n  - b")).toMatch(/<li>a\n<ul>\n<li>b<\/li>/);
  });
});

describe("composeProjectMarkdown", () => {
  it("appends uploaded images with numbered captions", () => {
    const markdown = composeProjectMarkdown({
      title: "RICE",
      markdown: "## 소개",
      imagePaths: ["projects/p/a.png", "projects/p/b.png"],
    });
    expect(markdown).toBe(
      "## 소개\n\n![RICE 1](<projects/p/a.png>)\n\n![RICE 2](<projects/p/b.png>)",
    );
    expect(render(markdown)).toContain("<figcaption>RICE 2</figcaption>");
  });

  it("falls back to a placeholder when empty", () => {
    expect(composeProjectMarkdown({ title: "x", markdown: "  \n", imagePaths: [] })).toBe(
      PROJECT_MARKDOWN_FALLBACK,
    );
  });

  it("escapes brackets in titles used as alt text", () => {
    const markdown = composeProjectMarkdown({
      title: "a]b",
      markdown: "",
      imagePaths: ["projects/p/a.png"],
    });
    expect(render(markdown)).toContain("<figcaption>a]b 1</figcaption>");
  });
});

describe("dedentMarkdown", () => {
  it("removes shared indentation and surrounding blank lines", () => {
    expect(dedentMarkdown("\n\n    ## 제목\r\n\n    본문\n      들여쓰기\n\n")).toBe(
      "## 제목\n\n본문\n  들여쓰기",
    );
  });
});
