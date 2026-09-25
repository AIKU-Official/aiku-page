"use client";

import { useEffect, useRef, type ComponentProps } from "react";

/**
 * Figure that turns into a dashed "이미지 파일 연결 필요" box when its image
 * fails to load (legacy behavior for broken project image links).
 */
export function MarkdownFigure(props: ComponentProps<"figure">) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const figure = ref.current;
    const image = figure?.querySelector("img");
    if (!figure || !image) {
      return;
    }

    const markMissing = () => {
      image.hidden = true;
      figure.classList.add("is-missing-image");
    };
    image.addEventListener("error", markMissing);
    return () => image.removeEventListener("error", markMissing);
  }, []);

  return <figure ref={ref} {...props} />;
}
