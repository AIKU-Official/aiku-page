import { Pill } from "@/components/ui/Pill";
import { rankLabel, type Rank } from "@/lib/ranks";

// 1st, 2nd and 3rd place look the same wherever they appear: gold, silver and
// bronze, labelled "1등", "2등", "3등" (projects, AIKUTHON, profiles, filters).

export { RANKS, rankLabel, type Rank } from "@/lib/ranks";

export const RANK_TONES: Record<
  Rank,
  {
    /** Pill colours. */
    pill: string;
    /** Faint diagonal wash from the top right, with a matching border, for cards. */
    card: string;
    /** A filter chip: outlined when off, filled with a firm edge when on. */
    chip: { off: string; on: string };
  }
> = {
  1: {
    pill: "bg-amber-100 text-amber-800",
    card: "border-amber-800/10 bg-linear-to-bl from-amber-100/45 to-white to-70%",
    chip: {
      off: "border-amber-800/25 bg-surface text-amber-800 hover:bg-amber-100/50",
      on: "border-amber-800/70 bg-amber-100 text-amber-800 ring-1 ring-amber-800/70",
    },
  },
  2: {
    pill: "bg-silver-100 text-silver-800",
    card: "border-silver-800/10 bg-linear-to-bl from-silver-100/55 to-white to-70%",
    chip: {
      off: "border-silver-800/25 bg-surface text-silver-800 hover:bg-silver-100/60",
      on: "border-silver-800/70 bg-silver-100 text-silver-800 ring-1 ring-silver-800/70",
    },
  },
  3: {
    pill: "bg-bronze-100 text-bronze-800",
    card: "border-bronze-800/10 bg-linear-to-bl from-bronze-100/45 to-white to-70%",
    chip: {
      off: "border-bronze-800/25 bg-surface text-bronze-800 hover:bg-bronze-100/50",
      on: "border-bronze-800/70 bg-bronze-100 text-bronze-800 ring-1 ring-bronze-800/70",
    },
  },
};

/** "1등" in gold, "2등" in silver, "3등" in bronze. */
export function RankPill({ rank, className }: { rank: Rank; className?: string }) {
  return (
    <Pill tone={RANK_TONES[rank].pill} className={className}>
      {rankLabel(rank)}
    </Pill>
  );
}
