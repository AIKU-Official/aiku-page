"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { navItems } from "@/lib/site";

const subscribeToScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const toggleBar =
  "mx-auto my-1 block h-0.5 w-[18px] rounded-[2px] bg-ink transition-[translate,rotate,opacity]";

export function SiteHeader() {
  const pathname = usePathname();
  const isScrolled = useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > 8,
    () => false,
  );

  // The menu is tied to the path it was opened on, so navigating closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const isOpen = openedOn === pathname;
  const closeNav = () => setOpenedOn(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenedOn(null);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <header
      className={clsx(
        "sticky top-0 z-20 flex min-h-(--header-height) items-center justify-between gap-6 border-b bg-white/92 header-gutter backdrop-blur-[14px] transition-[border-color,box-shadow]",
        isScrolled
          ? "border-soft-line shadow-[0_8px_30px_rgba(24,27,31,0.06)]"
          : "border-transparent",
      )}
    >
      <Link
        href="/"
        className="inline-flex min-w-[92px] items-center"
        aria-label="AIKU 홈으로 이동"
      >
        <Image
          src="/assets/aiku-logo-green.png"
          alt="AIKU"
          width={84}
          height={26}
          preload
          className="h-auto w-[84px] max-lg:w-[76px]"
        />
      </Link>

      <button
        type="button"
        className="hidden size-[42px] rounded-control border border-line bg-surface max-lg:block"
        aria-label={isOpen ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={isOpen}
        aria-controls="site-nav"
        onClick={() => setOpenedOn(isOpen ? null : pathname)}
      >
        <span className={clsx(toggleBar, isOpen && "translate-y-[6px] rotate-45")} />
        <span className={clsx(toggleBar, isOpen && "opacity-0")} />
        <span className={clsx(toggleBar, isOpen && "-translate-y-[6px] -rotate-45")} />
      </button>

      <nav
        id="site-nav"
        aria-label="주요 메뉴"
        className={clsx(
          "flex items-center gap-1",
          "max-lg:fixed max-lg:inset-x-0 max-lg:top-(--header-height) max-lg:grid-cols-1 max-lg:items-stretch max-lg:gap-0 max-lg:border-b max-lg:border-soft-line max-lg:bg-white/98 max-lg:px-[18px] max-lg:pt-2 max-lg:pb-[18px] max-lg:shadow-[0_20px_28px_rgba(24,27,31,0.08)]",
          isOpen ? "max-lg:grid" : "max-lg:hidden",
        )}
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            prefetch={item.prefetch}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
            onClick={closeNav}
            className="inline-flex min-h-[38px] items-center justify-center rounded-control px-3 text-[0.95rem] font-bold text-muted transition-[background-color,color] hover:bg-surface-mint hover:text-ink focus-visible:bg-surface-mint focus-visible:text-ink aria-[current=page]:bg-surface-mint aria-[current=page]:text-ink max-lg:min-h-[46px] max-lg:justify-start"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
