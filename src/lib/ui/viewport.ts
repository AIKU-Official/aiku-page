// The phone breakpoint, matching Tailwind's `max-sm:` (below 561px). Cards,
// names and profiles open a page on phones instead of a centre peek.
export const PHONE_QUERY = "(width < 561px)";

export const isPhone = () => window.matchMedia(PHONE_QUERY).matches;
