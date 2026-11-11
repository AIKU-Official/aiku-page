"use client";

import clsx from "clsx";
import { useState } from "react";

/** Round profile picture; falls back to the first letter of the name. */
export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const showImage = src && src !== failedSrc;

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 font-semibold text-green-800",
        className,
      )}
    >
      {showImage ? (
        // A plain img: the picture comes from Google, GitHub or the uploads bucket, sized by CSS.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <span aria-hidden="true">{name.trim().charAt(0).toUpperCase()}</span>
      )}
    </span>
  );
}
