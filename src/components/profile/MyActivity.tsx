"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import { getMyActivity, type MyActivity as Activity } from "@/actions/activity";
import { currentAccessToken } from "@/components/profile/useMyProfile";
import { CenterPeek } from "@/components/ui/CenterPeek";
import {
  ATTENDANCE_LABELS,
  ATTENDANCE_ORDER,
  calendarWeeks,
  formatDay,
  formatPoints,
  worstStatus,
  type AttendanceStatus,
} from "@/lib/activity/calendar";
import { useMemberAccount } from "@/lib/auth/member";

const TONES: Record<AttendanceStatus, string> = {
  present: "bg-attend-present",
  excused_late: "bg-attend-excused-late",
  late: "bg-attend-late",
  absent: "bg-attend-absent",
  excused_absent: "bg-attend-excused",
};

type Tip = { x: number; y: number; date: string };

/**
 * The member's own attendance calendar and points, at the foot of their
 * profile's side column. Rendered only when the viewer is signed in as this
 * member; the records come from a server action that reads the member from
 * the session, so a public profile never carries them.
 */
export function MyActivity({ memberId }: { memberId: string }) {
  const account = useMemberAccount();
  const isMe = Boolean(account?.member && account.member.id === memberId);
  const [activity, setActivity] = useState<Activity | null>(null);

  useEffect(() => {
    if (!isMe) return;
    let cancelled = false;
    void (async () => {
      const result = await getMyActivity(await currentAccessToken());
      if (!cancelled && result.ok) setActivity(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [isMe]);

  if (!isMe || !activity) return null;
  return (
    <section className="grid gap-4 border-t border-soft-line pt-6" aria-label="내 출결과 상벌점">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-label font-semibold tracking-[0.08em] text-muted uppercase">
          출결 · {activity.semester}학기
        </h3>
        <span className="text-label text-muted">본인에게만 보입니다</span>
      </div>
      {activity.days.length ? <AttendanceCalendar activity={activity} /> : null}
      <PointsButton activity={activity} />
    </section>
  );
}

function AttendanceCalendar({ activity }: { activity: Activity }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const byDay = new Map(activity.days.map((day) => [day.date, day.sessions]));
  const weeks = calendarWeeks(activity.first, activity.last);

  const show = (event: ReactMouseEvent<HTMLElement>, date: string) =>
    setTip({ x: event.clientX, y: event.clientY, date });

  return (
    <div className="grid gap-3">
      <div
        className="flex gap-[3px] overflow-x-auto pb-1"
        onMouseLeave={() => setTip(null)}
        role="grid"
        aria-label="출결 달력"
      >
        {weeks.map((week, w) => (
          <div key={w} className="grid shrink-0 grid-rows-7 gap-[3px]" role="row">
            {week.map((date, d) => {
              const sessions = date ? byDay.get(date) : undefined;
              const status = sessions ? worstStatus(sessions.map((s) => s.status)) : null;
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  disabled={!sessions}
                  aria-label={
                    sessions && date
                      ? `${formatDay(date)}: ${sessions.map((s) => `${s.title} ${ATTENDANCE_LABELS[s.status]}`).join(", ")}`
                      : undefined
                  }
                  onMouseEnter={sessions && date ? (event) => show(event, date) : undefined}
                  onMouseMove={sessions && date ? (event) => show(event, date) : undefined}
                  onClick={
                    sessions && date
                      ? (event) => (tip?.date === date ? setTip(null) : show(event, date))
                      : undefined
                  }
                  className={clsx(
                    "size-3 rounded-[3px]",
                    status ? TONES[status] : date ? "bg-surface-soft" : "bg-transparent",
                    sessions && "cursor-default outline-offset-1 hover:outline hover:outline-ink/40",
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1.5 text-label text-muted" aria-label="범례">
        {ATTENDANCE_ORDER.map((status) => (
          <li key={status} className="inline-flex items-center gap-1.5">
            <span className={clsx("size-2.5 rounded-[3px]", TONES[status])} aria-hidden="true" />
            {ATTENDANCE_LABELS[status]}
          </li>
        ))}
      </ul>
      {tip ? <DayTip tip={tip} sessions={byDay.get(tip.date) ?? []} /> : null}
    </div>
  );
}

/** The little box beside the cursor: which sessions that day, and why one was missed. */
function DayTip({ tip, sessions }: { tip: Tip; sessions: Activity["days"][number]["sessions"] }) {
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: tip.x + 14, top: tip.y + 14 });

  useEffect(() => {
    const width = box.current?.offsetWidth ?? 220;
    const height = box.current?.offsetHeight ?? 80;
    setPosition({
      left: Math.min(tip.x + 14, window.innerWidth - width - 8),
      top: tip.y + 14 + height > window.innerHeight ? tip.y - height - 10 : tip.y + 14,
    });
  }, [tip]);

  return (
    <div
      ref={box}
      role="tooltip"
      style={position}
      className="pointer-events-none fixed z-50 grid max-w-64 gap-1.5 rounded-control border border-line bg-surface px-3 py-2.5 text-small shadow-lg"
    >
      <p className="font-semibold text-ink">{formatDay(tip.date)}</p>
      <ul className="grid gap-1">
        {sessions.map((session, index) => (
          <li key={index} className="flex items-start gap-2">
            <span
              className={clsx("mt-1.5 size-2 shrink-0 rounded-[2px]", TONES[session.status])}
              aria-hidden="true"
            />
            <span className="text-body">
              {session.title} · {ATTENDANCE_LABELS[session.status]}
              {session.reason ? <span className="text-muted"> · {session.reason}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PointsButton({ activity }: { activity: Activity }) {
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center justify-between rounded-control border border-line bg-surface px-4 text-small font-semibold text-ink transition-colors hover:border-line-strong hover:bg-surface-soft"
      >
        상벌점 내역
        <span
          className={clsx(
            "tabular-nums",
            activity.total < 0 ? "text-danger" : activity.total > 0 ? "text-green-800" : "text-muted",
          )}
        >
          {formatPoints(activity.total)}점
        </span>
      </button>
      {open ? (
        <CenterPeek
          label="상벌점 내역"
          origin={() => button.current?.getBoundingClientRect()}
          originRadius="10px"
          onClose={() => setOpen(false)}
          className="w-[min(36rem,calc(100vw-2rem))] p-8 max-sm:p-5 max-sm:pt-14"
        >
          <PointsPanel activity={activity} />
        </CenterPeek>
      ) : null}
    </>
  );
}

function PointsPanel({ activity }: { activity: Activity }) {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-label font-semibold tracking-[0.08em] text-muted uppercase">
          {activity.semester}학기 상벌점
        </p>
        <p
          className={clsx(
            "mt-1 text-[2rem] leading-tight font-extrabold tabular-nums",
            activity.total < 0 ? "text-danger" : "text-ink",
          )}
        >
          {formatPoints(activity.total)}점
        </p>
        {activity.atRisk ? (
          <p className="mt-2 rounded-control bg-danger-soft px-3 py-2 text-small text-danger">
            누적 상벌점이 -5점 이하라 이번 학기 재이수 기준에 해당합니다.
          </p>
        ) : null}
      </div>
      {activity.entries.length ? (
        <ul className="divide-y divide-soft-line border-y border-soft-line">
          {activity.entries.map((entry, index) => (
            <li key={index} className="flex items-baseline gap-3 py-3">
              <span className="w-12 shrink-0 text-small text-muted tabular-nums">
                {entry.date ? entry.date.slice(5).replace("-", "/") : ""}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-ink">{entry.title}</span>
                <span className="block text-small text-muted">{entry.label}</span>
              </span>
              <span
                className={clsx(
                  "shrink-0 font-semibold tabular-nums",
                  entry.points < 0 ? "text-danger" : "text-green-800",
                )}
              >
                {formatPoints(entry.points)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-muted">이번 학기 상벌점 기록이 없습니다.</p>
      )}
      <p className="text-label text-muted">
        학기가 끝나면 점수는 0점으로 초기화됩니다. 기록이 잘못되었으면 운영진에게 알려주세요.
      </p>
    </div>
  );
}
