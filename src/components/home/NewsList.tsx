import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { formatNewsDate } from "@/lib/news/format-date";
import type { NewsItem } from "@/lib/types";

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <div className="grid gap-3">
      {items.length === 0 ? <EmptyNotice>등록된 소식이 아직 없습니다.</EmptyNotice> : null}
      {items.map((item) => (
        <article
          key={item.id}
          className="grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-5 border-t border-soft-line py-5 last:border-b max-lg:grid-cols-1 max-lg:gap-2"
        >
          {item.date ? (
            <time dateTime={item.date} className="text-[0.86rem] font-[850] text-brand">
              {formatNewsDate(item.date)}
            </time>
          ) : (
            <span aria-hidden="true" className="max-lg:hidden" />
          )}
          <div>
            <h3 className="mb-1">{item.title}</h3>
            {item.summary ? <p className="text-muted">{item.summary}</p> : null}
          </div>
          {item.linkUrl ? (
            <a
              href={item.linkUrl}
              {...(/^https?:\/\//i.test(item.linkUrl)
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              className="w-fit font-extrabold text-brand-deep underline decoration-1 underline-offset-4"
            >
              {item.linkLabel || "보기"}
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}
