"use client";

import clsx from "clsx";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";

import { navItems, type NavItem } from "@/lib/site";

const subscribeToScroll = (onChange: () => void) => {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
};

const isActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

const toggleBar =
  "mx-auto my-1 block h-0.5 w-[18px] rounded-full bg-ink transition-[translate,rotate,opacity]";

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

  const renderLink = (item: NavItem) => (
    <Link
      key={item.href}
      href={item.href}
      prefetch={item.prefetch}
      aria-current={
        [item.href, ...(item.alsoActiveOn ?? [])].some((href) => isActive(pathname, href))
          ? "page"
          : undefined
      }
      onClick={closeNav}
      className={clsx(
        "inline-flex h-9 items-center rounded-full px-3.5 font-medium transition-[background-color,color] hover:bg-surface-soft hover:text-ink aria-[current=page]:bg-green-100 aria-[current=page]:font-semibold aria-[current=page]:text-green-800 max-lg:h-12 max-lg:rounded-control max-lg:px-3 max-lg:text-[1.0625rem]",
        item.utility ? "text-small text-muted" : "text-[0.9375rem] text-body",
      )}
    >
      {item.label}
    </Link>
  );

  return (
    <header
      className={clsx(
        // The blur sits on a pseudo-element: backdrop-filter on the header itself
        // would become the containing block of the fixed mobile menu and clip it.
        "sticky top-0 z-20 flex min-h-(--header-height) items-center justify-between gap-6 border-b header-gutter transition-[border-color,box-shadow] before:absolute before:inset-0 before:-z-10 before:bg-white/85 before:backdrop-blur-md",
        isScrolled
          ? "border-soft-line shadow-[0_6px_24px_rgb(29_29_29/0.06)]"
          : "border-transparent",
      )}
    >
      <Link href="/" className="inline-flex shrink-0 items-center" aria-label="AIKU 홈으로 이동">
        <Image
          src="/assets/aiku-logo-green.png"
          alt="AIKU"
          width={84}
          height={26}
          preload
          className="h-auto w-[84px] max-lg:w-[76px] max-sm:w-[68px]"
        />
      </Link>

      <button
        type="button"
        className="hidden size-10 rounded-control border border-line bg-surface transition-colors hover:bg-surface-soft max-lg:block"
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
          "flex items-center gap-0.5",
          "max-lg:fixed max-lg:inset-x-0 max-lg:top-(--header-height) max-lg:bottom-0 max-lg:flex-col max-lg:items-stretch max-lg:gap-1 max-lg:overflow-y-auto max-lg:bg-white max-lg:px-5 max-lg:pt-3 max-lg:pb-8",
          isOpen ? "max-lg:flex max-lg:motion-safe:animate-menu" : "max-lg:hidden",
        )}
      >
        {navItems.filter((item) => !item.utility).map(renderLink)}
        <span
          aria-hidden="true"
          className="mx-2 h-4 w-px bg-line max-lg:mx-0 max-lg:my-2 max-lg:h-px max-lg:w-full"
        />
        {navItems.filter((item) => item.utility).map(renderLink)}
      </nav>
    </header>
  );
}
