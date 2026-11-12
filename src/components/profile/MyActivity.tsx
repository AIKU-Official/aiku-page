"use client";

import clsx from "clsx";
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

import {
  getMyActivity,
  type ActivitySemester as Activity,
  type ActivitySession,
} from "@/actions/activity";
import { CenterPeek } from "@/components/ui/CenterPeek";
import {
  ATTENDANCE_LABELS,
  formatDay,
  formatPoints,
  SESSION_KIND_LABELS,
  type AttendanceStatus,
} from "@/lib/activity/calendar";
import { useMemberAccount } from "@/lib/auth/member";
import { useSignedInData } from "@/lib/auth/signed-in-data";

const TONES: Record<AttendanceStatus, string> = {
  present: "bg-attend-present",
  excused_late: "bg-attend-excused-late",
  late: "bg-attend-late",
  absent: "bg-attend-absent",
  excused_absent: "bg-attend-excused",
};

type Tip = { x: number; y: number; index: number };

/**
 * The member's own attendance calendar and points, at the foot of their
 * profile's side column. Rendered only when the viewer is signed in as this
 * member; the records come from a server action that reads the member from
 * the session, so a public profile never carries them.
 */
export function MyActivity({ memberId }: { memberId: string }) {
  const account = useMemberAccount();
  const isMe = Boolean(account?.member && account.member.id === memberId);
  const [state] = useSignedInData(isMe ? memberId : null, getMyActivity);
  const semesters = state.status === "ready" ? state.data : [];
  // 0 is the newest semester; ">" moves towards it, "<" back in time.
  const [page, setPage] = useState(0);

  const activity = semesters[page];
  if (!isMe || !activity) return null;
  return (
    <section className="grid gap-4 border-t border-soft-line pt-6" aria-label="내 출결과 상벌점">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <PageButton
            label="이전 학기"
            disabled={page >= semesters.length - 1}
            onClick={() => setPage((value) => value + 1)}
            path="M10 3.5 5.5 8l4.5 4.5"
          />
          <h3 className="min-w-[6.5rem] text-center text-label font-semibold tracking-[0.08em] text-muted uppercase">
            출결 · {activity.semester}학기
          </h3>
          <PageButton
            label="다음 학기"
            disabled={page === 0}
            onClick={() => setPage((value) => value - 1)}
            path="M6 3.5 10.5 8 6 12.5"
          />
        </div>
        <span className="text-label text-muted/60">본인에게만 보입니다</span>
      </div>
      {activity.sessions.length ? (
        <AttendanceCalendar key={activity.semester} sessions={activity.sessions} />
      ) : (
        <p className="text-small text-muted">이 학기의 출결 기록이 없습니다.</p>
      )}
      <PointsButton activity={activity} />
    </section>
  );
}

/** "<" or ">" beside the semester; the same size and states on both sides. */
function PageButton({
  label,
  disabled,
  onClick,
  path,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  path: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-soft hover:text-ink disabled:pointer-events-none disabled:opacity-30"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={path} />
      </svg>
    </button>
  );
}

/**
 * One square per session, in the order they were held: two sessions on the
 * same day are two squares, and days without a session have none.
 */
function AttendanceCalendar({ sessions }: { sessions: ActivitySession[] }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const show = (event: ReactMouseEvent<HTMLElement>, index: number) =>
    setTip({ x: event.clientX, y: event.clientY, index });

  return (
    <div onMouseLeave={() => setTip(null)}>
      <ul className="flex flex-wrap gap-1" aria-label="출결 기록">
        {sessions.map((session, index) => (
          <li key={index}>
            <button
              type="button"
              aria-label={`${formatDay(session.date)} ${session.title}: ${ATTENDANCE_LABELS[session.status]}${session.reason ? `, ${session.reason}` : ""}`}
              onMouseEnter={(event) => show(event, index)}
              onMouseMove={(event) => show(event, index)}
              onClick={(event) => (tip?.index === index ? setTip(null) : show(event, index))}
              className={clsx(
                "block size-4 cursor-default rounded-[4px] outline-offset-1 hover:outline hover:outline-ink/40",
                TONES[session.status],
              )}
            />
          </li>
        ))}
      </ul>
      {tip ? <SessionTip tip={tip} session={sessions[tip.index]} /> : null}
    </div>
  );
}

/** The little box beside the cursor: what the session was, how it went, and why. */
function SessionTip({ tip, session }: { tip: Tip; session: ActivitySession }) {
  const box = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: tip.x + 14, top: tip.y + 14 });

  useEffect(() => {
    const width = box.current?.offsetWidth ?? 220;
    const height = box.current?.offsetHeight ?? 80;
    setPosition({
      left: Math.max(8, Math.min(tip.x + 14, window.innerWidth - width - 8)),
      top: tip.y + 14 + height > window.innerHeight ? tip.y - height - 10 : tip.y + 14,
    });
  }, [tip]);

  return (
    <div
      ref={box}
      role="tooltip"
      style={position}
      className="pointer-events-none fixed z-50 grid max-w-64 gap-1 rounded-control border border-line bg-surface px-3 py-2.5 text-small shadow-lg"
    >
      <p className="text-label text-muted">
        {formatDay(session.date)} · {SESSION_KIND_LABELS[session.kind]}
      </p>
      <p className="font-semibold text-ink">{session.title}</p>
      <p className="flex items-center gap-1.5 text-body">
        <span className={clsx("size-2 shrink-0 rounded-[2px]", TONES[session.status])} aria-hidden="true" />
        {ATTENDANCE_LABELS[session.status]}
        {session.reason ? <span className="text-muted">· {session.reason}</span> : null}
      </p>
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
          expandable={false}
          width="max-w-[44rem]"
          className="p-10 max-lg:p-8 max-sm:p-5 max-sm:pt-14"
        >
          <PointsPanel activity={activity} />
        </CenterPeek>
      ) : null}
    </>
  );
}

function PointsPanel({ activity }: { activity: Activity }) {
  return (
    // Fades out early as the panel shrinks back into the button, and in once
    // it has room, so nothing is cut off at the end of the motion.
    <div data-peek-panel-only className="grid gap-5">
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
