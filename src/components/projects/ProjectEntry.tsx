"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { Fragment, useCallback, useRef, useState, type ReactNode } from "react";

import { CenterPeek } from "@/components/ui/CenterPeek";
import { Eyebrow } from "@/components/ui/Eyebrow";
import type { ProjectPerson } from "@/lib/types";

import { PersonName } from "./PersonName";

type ProjectEntryProps = {
  id: string;
  period: string;
  title: string;
  tags: string[];
  oneLine: string;
  awardRank: 1 | 2 | 3 | null;
  people: ProjectPerson[];
  /** Server-rendered resource links. */
  resources: ReactNode;
  /** Server-rendered markdown body, shown when the card is opened. */
  body: ReactNode;
};

// Gold, silver and bronze: the tag, and a faint diagonal wash that starts at
// the top right of the card and fades to white.
const AWARDS = {
  1: {
    label: "1등",
    pill: "bg-amber-100 text-amber-800",
    card: "border-amber-800/10 bg-linear-to-bl from-amber-100/45 to-white to-70%",
  },
  2: {
    label: "2등",
    pill: "bg-silver-100 text-silver-800",
    card: "border-silver-800/10 bg-linear-to-bl from-silver-100/55 to-white to-70%",
  },
  3: {
    label: "3등",
    pill: "bg-bronze-100 text-bronze-800",
    card: "border-bronze-800/10 bg-linear-to-bl from-bronze-100/45 to-white to-70%",
  },
} as const;

function Heading({ period, awardRank }: Pick<ProjectEntryProps, "period" | "awardRank">) {
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 max-sm:min-h-9">
      <Eyebrow spacing="none">{period || "AIKU"}</Eyebrow>
      {awardRank ? (
        <span
          className={clsx(
            "inline-flex h-6 items-center rounded-full px-2.5 text-label whitespace-nowrap",
            AWARDS[awardRank].pill,
          )}
        >
          {AWARDS[awardRank].label}
        </span>
      ) : null}
    </div>
  );
}

function Tags({ tags }: { tags: string[] }) {
  if (!tags.length) return null;
  return (
    <ul className="mt-4 flex flex-wrap gap-1.5 max-sm:mt-3" aria-label="관련 분야">
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

function People({ people }: { people: ProjectPerson[] }) {
  if (!people.length) return null;
  return (
    // Above the card's click layer, so names can be hovered and clicked.
    <dl className="relative z-10 mt-4 grid w-fit gap-1 text-small max-sm:mt-3">
      {(["leader", "member"] as const).map((role) => {
        const group = people.filter((person) => person.role === role);
        return group.length ? (
          <div key={role} className="flex gap-3">
            <dt className="w-9 shrink-0 text-muted">{role === "leader" ? "팀장" : "팀원"}</dt>
            <dd className="min-w-0 text-body">
              {group.map((person, index) => (
                <Fragment key={person.name}>
                  {index ? ", " : null}
                  <PersonName person={person} />
                </Fragment>
              ))}
            </dd>
          </div>
        ) : null;
      })}
    </dl>
  );
}

const cardPadding = "p-8 max-sm:p-5";

/**
 * What a project shows at a glance. The card and the top of the opened panel
 * both render this, at the same padding, so one can turn into the other.
 */
export function ProjectFace({
  period,
  title,
  tags,
  oneLine,
  awardRank,
  people,
  resources,
  onOpen,
}: Omit<ProjectEntryProps, "id" | "body"> & { onOpen?: () => void }) {
  return (
    <>
      <div className="flex items-start justify-between gap-8 max-lg:flex-col max-lg:gap-5 max-sm:gap-4">
        <div className="min-w-0">
          <Heading period={period} awardRank={awardRank} />
          <h2 className="mt-2 text-[1.625rem] leading-[1.3] font-extrabold tracking-[-0.025em] max-sm:text-[1.25rem]">
            {onOpen ? (
              // The button's ::after covers the card, so the whole card opens the project.
              <button
                type="button"
                onClick={onOpen}
                className="cursor-pointer text-left font-[inherit] tracking-[inherit] after:absolute after:inset-0 after:rounded-card focus-visible:outline-none"
              >
                {title}
              </button>
            ) : (
              title
            )}
          </h2>
          <Tags tags={tags} />
          <People people={people} />
        </div>
        <div
          className={clsx(
            "relative z-10 shrink-0",
            // On a phone's card the links are icons in the top corner; on the page they sit under the title.
            onOpen && "max-sm:absolute max-sm:top-4 max-sm:right-4",
          )}
        >
          {resources}
        </div>
      </div>
      {/* Spans the card, so the sentence wraps as little as possible. */}
      {oneLine ? <p className="mt-4 text-body max-sm:mt-3">{oneLine}</p> : null}
    </>
  );
}

/** A project card. Clicking it unfolds the card into the full write-up. */
export function ProjectEntry({ id, body, ...face }: ProjectEntryProps) {
  const { title, awardRank } = face;
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const card = useRef<HTMLElement>(null);
  const cardRect = useCallback(() => card.current?.getBoundingClientRect(), []);

  // Size of the card when it was opened: the tint in the panel covers exactly that.
  const [tintSize, setTintSize] = useState<{ width: number; height: number } | null>(null);
  const router = useRouter();
  const openPanel = () => {
    // Phones get the project's own page: a panel over a small screen is just a page without an address.
    if (window.matchMedia("(width < 561px)").matches) {
      router.push(`/projects/${id}`);
      return;
    }
    const rect = card.current?.getBoundingClientRect();
    setTintSize(rect ? { width: rect.width, height: rect.height } : null);
    setOpen(true);
  };

  return (
    <>
      <article
        ref={card}
        id={`project-${id}`}
        className={clsx(
          "relative reveal scroll-mt-[calc(var(--header-height)+24px)] card transition-[translate,box-shadow,border-color] duration-200 hover:-translate-y-1 hover:shadow-[0_14px_36px_rgb(29_29_29/0.09)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green-500",
          cardPadding,
          awardRank ? AWARDS[awardRank].card : "hover:border-line-strong",
          // While open, the panel is this card: the original steps out of view.
          open && "invisible",
        )}
      >
        <ProjectFace {...face} onOpen={openPanel} />
      </article>

      {open ? (
        <CenterPeek
          label={title}
          onClose={close}
          origin={cardRect}
          expandHref={`/projects/${id}`}
          className={clsx("relative isolate border border-line", cardPadding)}
        >
          {/* A prize card's tint: there at the start so the panel matches the card, then faded out. */}
          {awardRank && tintSize ? (
            <div
              data-peek-origin-only
              aria-hidden="true"
              style={tintSize}
              className={clsx(
                "pointer-events-none absolute top-0 left-0 -z-10 rounded-card",
                AWARDS[awardRank].card,
              )}
            />
          ) : null}
          <ProjectFace {...face} />
          {/* Here the write-up uses the panel's full width, and its pictures share one height. */}
          <div className="peek-body mt-7 border-t border-soft-line max-sm:mt-5 [&_.markdown-body]:max-w-none">
            {body}
          </div>
        </CenterPeek>
      ) : null}
    </>
  );
}
