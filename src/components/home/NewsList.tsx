import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { ArrowRightIcon, ArrowUpRightIcon } from "@/components/ui/icons";
import { formatNewsDate } from "@/lib/news/format-date";
import type { NewsItem } from "@/lib/types";

export function NewsList({ items }: { items: NewsItem[] }) {
  if (items.length === 0) {
    return <EmptyNotice>등록된 소식이 아직 없습니다.</EmptyNotice>;
  }

  return (
    <div className="reveal divide-y divide-soft-line card">
      {items.map((item) => {
        const external = item.linkUrl ? /^https?:\/\//i.test(item.linkUrl) : false;
        const LinkIcon = external ? ArrowUpRightIcon : ArrowRightIcon;
        return (
          <article
            key={item.id}
            className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-6 px-7 py-6 max-lg:grid-cols-1 max-lg:gap-2 max-sm:gap-1 max-sm:px-4 max-sm:py-4"
          >
            {item.date ? (
              <time dateTime={item.date} className="text-label text-green-700 tabular-nums">
                {formatNewsDate(item.date)}
              </time>
            ) : (
              <span aria-hidden="true" className="max-lg:hidden" />
            )}
            <div>
              <h3>{item.title}</h3>
              {item.summary ? <p className="mt-1 text-muted">{item.summary}</p> : null}
            </div>
            {item.linkUrl ? (
              <a
                href={item.linkUrl}
                {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                className="group inline-flex w-fit items-center gap-1.5 text-small font-semibold text-green-800"
              >
                {item.linkLabel || "보기"}
                <LinkIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
