import { describe, expect, it } from "vitest";

import { mapProfile, normalizeLink } from "./profile";

describe("normalizeLink", () => {
  it("expands a bare handle to the service's profile URL", () => {
    expect(normalizeLink("instagram", "@aiku._.official")).toBe(
      "https://www.instagram.com/aiku._.official",
    );
    expect(normalizeLink("github", "AIKU-Official")).toBe("https://github.com/AIKU-Official");
    expect(normalizeLink("linkedin", "chan-lee")).toBe("https://www.linkedin.com/in/chan-lee");
  });

  it("keeps full links and adds a missing scheme", () => {
    expect(normalizeLink("github", "https://github.com/x")).toBe("https://github.com/x");
    expect(normalizeLink("github", "github.com/x")).toBe("https://github.com/x");
    expect(normalizeLink("website", "example.com")).toBe("https://example.com");
  });

  it("returns an empty string for empty input", () => {
    expect(normalizeLink("website", "   ")).toBe("");
  });
});

describe("mapProfile", () => {
  it("drops malformed list entries instead of failing", () => {
    const profile = mapProfile({
      is_public: true,
      headline: "",
      tagline: "",
      bio: "",
      avatar_path: null,
      contact_email: null,
      github_url: null,
      instagram_url: null,
      linkedin_url: null,
      website_url: null,
      focus: ["a"],
      interests: [{ title: "T", description: 3 }, "junk", null],
      skills: "not a list",
      experience: [{ period: "2025", title: "Intern" }],
    });
    expect(profile.interests).toEqual([{ title: "T", description: "" }]);
    expect(profile.skills).toEqual([]);
    expect(profile.experience).toEqual([{ period: "2025", title: "Intern", organization: "" }]);
  });
});
