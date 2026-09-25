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
        "group flex reveal flex-col overflow-hidden",
        feature && "col-span-2",
        imageUrl
          ? "card"
          : "min-h-[280px] justify-end rounded-card border border-dashed border-line-strong bg-linear-to-br from-green-50 to-white",
      )}
    >
      {imageUrl ? (
        <div
          className={clsx(
            "relative overflow-hidden bg-surface-soft",
            feature ? "aspect-2/1" : "aspect-4/3",
          )}
        >
          <Image
            src={imageUrl}
            alt={title || "AIKU 갤러리 이미지"}
            fill
            sizes={
              feature
                ? "(max-width: 980px) calc(100vw - 48px), 740px"
                : "(max-width: 980px) calc(100vw - 48px), 360px"
            }
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-2 p-6 max-sm:gap-1 max-sm:p-4">
        <span className="text-eyebrow text-green-700 uppercase">{category || "AIKU"}</span>
        <h2 className="text-subheading max-sm:text-[0.9375rem]">{title}</h2>
        {description ? <p className="text-muted max-sm:text-small">{description}</p> : null}
      </div>
    </article>
  );
}
