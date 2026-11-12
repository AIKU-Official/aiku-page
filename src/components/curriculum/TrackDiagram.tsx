/**
 * The 2-Track diagram, drawn as SVG so it stays sharp at any size.
 * Track 1: Junior half a year, then Senior half a year. Track 2: Senior for a year.
 * Colours come from the official artwork: its mint for Junior, the brand green
 * (Main #2, #21d081) deepening for Senior.
 */
export function TrackDiagram() {
  const label = {
    fill: "#9a9a9a",
    fontSize: 21,
    fontWeight: 800,
    letterSpacing: "0.02em",
  } as const;
  const caption = {
    fill: "#ffffff",
    fontSize: 26,
    fontWeight: 800,
    textAnchor: "middle",
    dominantBaseline: "central",
  } as const;

  return (
    <svg
      viewBox="0 0 960 280"
      role="img"
      aria-label="Track 1은 Junior 0.5년 후 Senior 0.5년, Track 2는 Senior 1년으로 구성됩니다."
      className="h-auto w-full"
    >
      <defs>
        <linearGradient id="track-junior" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#2fd6b4" />
          <stop offset="1" stopColor="#21c98c" />
        </linearGradient>
        <linearGradient id="track-senior" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#17a56b" />
          <stop offset="1" stopColor="#0e7a4d" />
        </linearGradient>
      </defs>

      <text x="20" y="80" dominantBaseline="central" {...label}>
        TRACK 1
      </text>
      <rect x="130" y="28" width="386" height="104" rx="6" fill="url(#track-junior)" />
      {/* The notch that points from Junior on to Senior. */}
      <path d="M516 70 L536 80 L516 90 Z" fill="#21c98c" />
      <rect x="536" y="28" width="394" height="104" rx="6" fill="url(#track-senior)" />
      <text x="323" y="80" {...caption}>
        JUNIOR (0.5년)
      </text>
      <text x="733" y="80" {...caption}>
        SENIOR (0.5년)
      </text>

      <text x="20" y="208" dominantBaseline="central" {...label}>
        TRACK 2
      </text>
      <rect x="130" y="156" width="800" height="104" rx="6" fill="url(#track-senior)" />
      <text x="530" y="208" {...caption}>
        SENIOR (1년)
      </text>
    </svg>
  );
}
