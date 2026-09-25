import clsx from "clsx";
import Image from "next/image";

type GalleryCardProps = {
  category: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  /** Wide card spanning two columns (the static AIKU archive card). */
  feature?: boolean;
};

export function GalleryCard({ category, title, description, imageUrl, feature }: GalleryCardProps) {
  return (
    <article
      className={clsx(
        "grid overflow-hidden rounded-card border border-line",
        feature && "col-span-2 max-lg:col-auto",
        imageUrl
          ? "bg-surface"
          : "min-h-[260px] content-end border-dashed bg-[linear-gradient(135deg,rgba(64,218,197,0.1),rgba(255,255,255,0.86)),var(--color-surface-soft)]",
      )}
    >
      {imageUrl ? (
        <div className={clsx("relative bg-surface-soft", feature ? "aspect-2/1" : "aspect-4/3")}>
          <Image
            src={imageUrl}
            alt={title || "AIKU 갤러리 이미지"}
            fill
            sizes={
              feature
                ? "(max-width: 980px) calc(100vw - 40px), 716px"
                : "(max-width: 980px) calc(100vw - 40px), 350px"
            }
            className="object-cover"
          />
        </div>
      ) : null}
      <div className="grid gap-2 p-[18px]">
        <span className="text-[0.82rem] font-[850] text-brand">{category || "AIKU"}</span>
        <h2>{title}</h2>
        {description ? <p className="text-muted">{description}</p> : null}
      </div>
    </article>
  );
}
