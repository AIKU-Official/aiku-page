"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { Section, SectionHead } from "@/components/layout/Section";
import { ProfileModal } from "@/components/profile/ProfileModal";
import { EmptyNotice } from "@/components/ui/EmptyNotice";
import { SearchIcon } from "@/components/ui/icons";
import { useMemberAccount } from "@/lib/auth/member";
import {
  ALL,
  directoryStatusText,
  generationFromHash,
  hashForGeneration,
  matchesFilter,
  type DirectoryFilter,
} from "@/lib/members/directory";
import { MEMBER_GRADE_LABELS, MEMBER_GRADES, type Generation, type Member } from "@/lib/types";

import { MemberCard } from "./MemberCard";
import { gradeBorderClassName, gradeDotClassName, gradeToneClassName } from "./tones";
import { isPhone } from "@/lib/ui/viewport";

const subscribeToHash = (onChange: () => void) => {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
};

const chipClassName = (active: boolean) =>
  clsx(
    "inline-flex h-10 items-center justify-center rounded-full border px-4 text-small font-semibold transition-[border-color,background-color,color,scale] active:scale-[0.97]",
    active
      ? "border-line-strong bg-surface-soft text-ink"
      : "border-line bg-surface text-body hover:border-line-strong hover:text-ink",
  );

export function MemberDirectory({ generations }: { generations: Generation[] }) {
  const generationNames = generations.map((generation) => generation.name);
  const hash = useSyncExternalStore(
    subscribeToHash,
    () => window.location.hash,
    () => "",
  );
  // A clicked generation wins until the hash is changed from outside (e.g. a link).
  const [selectedGeneration, setSelectedGeneration] = useState<string | null>(null);
  const [grade, setGrade] = useState<DirectoryFilter["grade"]>(ALL);
  const [query, setQuery] = useState("");
  // A signed-in member's own card leads to their profile page; other cards
  // open the public profile here, when there is one.
  const router = useRouter();
  const ownMemberId = useMemberAccount()?.member?.id;
  const [openProfile, setOpenProfile] = useState<{
    member: Member;
    card: HTMLElement;
    size: { width: number; height: number };
  } | null>(null);
  const openFrom = (member: Member, card: HTMLElement) => {
    // Phones open the profile's own page, as project cards do.
    if (isPhone()) {
      router.push(`/members/${member.id}`);
      return;
    }
    const rect = card.getBoundingClientRect();
    // The panel takes the card's place, so the card itself steps out of view.
    card.style.visibility = "hidden";
    setOpenProfile({ member, card, size: { width: rect.width, height: rect.height } });
  };
  const closeProfile = useCallback(() => {
    setOpenProfile((current) => {
      if (current) current.card.style.visibility = "";
      return null;
    });
  }, []);

  useEffect(() => {
    const onHashChange = () => setSelectedGeneration(null);
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const filter: DirectoryFilter = {
    generation: selectedGeneration ?? generationFromHash(hash, generationNames),
    grade,
    query,
  };

  const allMembers = generations.flatMap((generation) => generation.members);
  const groups = generations
    .map((generation) => ({
      ...generation,
      members: generation.members.filter((member) =>
        matchesFilter(member, generation.name, filter),
      ),
    }))
    .filter((generation) => generation.members.length > 0);
  const visibleCount = groups.reduce((sum, generation) => sum + generation.members.length, 0);

  const selectGeneration = (next: string) => {
    setSelectedGeneration(next);
    window.history.replaceState(null, "", hashForGeneration(next));
  };

  const gradeOptions: { value: DirectoryFilter["grade"]; label: string; count: number }[] = [
    { value: ALL, label: "전체", count: allMembers.length },
    ...MEMBER_GRADES.map((value) => ({
      value,
      label: MEMBER_GRADE_LABELS[value],
      count: allMembers.filter((member) => member.grade === value).length,
    })),
  ];

  const isFiltered = filter.generation !== ALL || grade !== ALL || query.trim() !== "";

  return (
    <>
      {/* White like the first section of every other page; the list below continues it. */}
      <Section className="pb-0 max-lg:pb-0 max-sm:pb-0">
        <div className="site-container">
          <SectionHead eyebrow="Directory" title="멤버 찾아보기">
            <p>
              0기부터 지금까지 AIKU와 함께한 멤버를 한곳에 모았습니다. 이름이나 직책으로 검색하고,
              등급과 기수로 좁혀보세요.
            </p>
          </SectionHead>

          {allMembers.length > 0 ? (
            <div className="grid gap-5 max-sm:gap-4">
              <label className="relative block max-w-[480px]">
                <span className="sr-only">멤버 검색</span>
                <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="이름, 학과, 직책으로 검색 (초성 가능)"
                  autoComplete="off"
                  enterKeyHint="search"
                  className="h-12 w-full rounded-full border border-line bg-surface pr-5 pl-11 text-ink transition-[border-color,box-shadow] placeholder:text-muted/70 focus:border-green-500 focus:shadow-[0_0_0_3px_rgb(33_208_129/0.14)] focus:outline-none"
                />
              </label>

              <div
                className="grid grid-cols-4 gap-3 max-sm:grid-cols-2 max-sm:gap-2"
                role="group"
                aria-label="멤버 등급 필터"
              >
                {gradeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={grade === option.value}
                    onClick={() => setGrade(option.value)}
                    className={clsx(
                      "grid gap-1 rounded-card border px-5 py-4 text-left transition-[border-color,background-color,scale] active:scale-[0.98] max-sm:px-4 max-sm:py-3",
                      grade !== option.value && "border-line bg-surface hover:border-line-strong",
                      grade === option.value &&
                        (option.value === ALL
                          ? "border-line-strong bg-surface-soft"
                          : [gradeBorderClassName[option.value], gradeToneClassName[option.value]]),
                    )}
                  >
                    <span className="flex items-center gap-1.5 text-label text-muted">
                      {option.value !== ALL ? (
                        <span
                          aria-hidden="true"
                          className={clsx("size-2 rounded-full", gradeDotClassName[option.value])}
                        />
                      ) : null}
                      {option.label}
                    </span>
                    <span className="text-heading text-ink tabular-nums">
                      {option.count}
                      <span className="ml-0.5 text-small font-medium text-muted">명</span>
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2" role="group" aria-label="멤버 기수 필터">
                {[ALL, ...generationNames].map((option) => (
                  <button
                    key={option}
                    type="button"
                    aria-pressed={filter.generation === option}
                    onClick={() => selectGeneration(option)}
                    className={chipClassName(filter.generation === option)}
                  >
                    {option === ALL ? "전체 기수" : option}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="text-small text-muted" aria-live="polite">
              {directoryStatusText(filter, visibleCount, allMembers.length)}
            </p>
            {isFiltered ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setGrade(ALL);
                  selectGeneration(ALL);
                }}
                className="text-small font-semibold text-green-800 underline-offset-4 hover:underline"
              >
                필터 초기화
              </button>
            ) : null}
          </div>
        </div>
      </Section>

      <Section className="pt-14 max-lg:pt-10 max-sm:pt-6">
        <div className="site-container grid gap-14 max-lg:gap-10 max-sm:gap-8">
          {groups.map((generation) => (
            <section
              key={generation.id}
              aria-labelledby={`generation-${generation.id}`}
              className="grid gap-5 motion-safe:animate-fade max-sm:gap-3"
            >
              <div className="flex items-center gap-3 border-b border-line pb-4 max-sm:pb-3">
                <h2 id={`generation-${generation.id}`}>{generation.name}</h2>
                <span className="inline-flex h-7 items-center rounded-full bg-surface-soft px-3 text-label text-muted tabular-nums">
                  {generation.members.length}명
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-3 max-sm:grid-cols-2 max-sm:gap-2">
                {generation.members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    onOpen={
                      member.id === ownMemberId
                        ? () => router.push("/profile")
                        : member.hasPublicProfile
                          ? (card) => openFrom(member, card)
                          : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ))}
          {allMembers.length > 0 && visibleCount === 0 ? (
            <EmptyNotice>조건에 맞는 멤버가 없습니다. 검색어나 필터를 바꿔보세요.</EmptyNotice>
          ) : null}
          {allMembers.length === 0 ? <EmptyNotice>아직 공개된 멤버가 없습니다.</EmptyNotice> : null}
        </div>
      </Section>
      {openProfile ? (
        <ProfileModal
          memberId={openProfile.member.id}
          onClose={closeProfile}
          origin={() => openProfile.card.getBoundingClientRect()}
          face={<MemberCard member={openProfile.member} style={openProfile.size} />}
        />
      ) : null}
    </>
  );
}
