import clsx from "clsx";

/** The field tags of a project or an AIKUTHON task, e.g. CV, NLP. */
export function FieldTags({ tags, className }: { tags: string[]; className?: string }) {
  if (!tags.length) return null;
  return (
    <ul className={clsx("flex flex-wrap gap-1.5", className)} aria-label="관련 분야">
      {tags.map((tag) => (
        <li
          key={tag}
          className="inline-flex h-7 items-center rounded-full bg-green-50 px-3 text-label text-green-800 ring-1 ring-green-200 ring-inset"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
