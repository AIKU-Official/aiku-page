"use client";

import clsx from "clsx";
import { useState } from "react";

/** Round profile picture; without one, a grey silhouette. */
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
        "inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full bg-[#e3e5e8] text-[#b3b8bf]",
        className,
      )}
    >
      {showImage ? (
        // A plain img: the picture comes from the uploads bucket and is sized by CSS.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          className="size-full object-cover"
          onError={() => setFailedSrc(src)}
        />
      ) : (
        <svg
          aria-label={name}
          role="img"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="size-full"
        >
          <circle cx="12" cy="9.2" r="4.3" />
          <path d="M12 15c-5 0-8.6 2.7-9.4 7.2V24h18.8v-1.8C20.6 17.7 17 15 12 15Z" />
        </svg>
      )}
    </span>
  );
}
