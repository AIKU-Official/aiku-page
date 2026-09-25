import { expect, test, type Page } from "@playwright/test";

const pages = [
  { path: "/", heading: "AIKU" },
  { path: "/about", heading: "고려대학교 딥러닝 학회 AIKU" },
  { path: "/activities", heading: "AIKU의 학술 활동과 교류 행사" },
  { path: "/curriculum", heading: "AIKU 커리큘럼" },
  { path: "/projects", heading: "분기별 우수 프로젝트" },
  { path: "/members", heading: "AIKU Members" },
  { path: "/contact", heading: "AIKU 컨택" },
];

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

for (const { path, heading } of pages) {
  test(`${path} renders without errors or horizontal overflow`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(path);
    // The home page title is the AIKU wordmark image, so match the accessible name.
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    // The menu is collapsed (display: none) on small screens, so check presence only.
    await expect(page.locator("nav#site-nav")).toBeAttached();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
  });
}

test("project filter follows the URL hash and expands cards", async ({ page }) => {
  await page.goto("/projects");
  const status = page.locator("p[aria-live=polite]");
  await expect(status).toHaveText(/^전체 프로젝트 \d+개를 보고 있습니다\.$/);

  const seasonButtons = page.getByRole("group", { name: "프로젝트 시즌 필터" }).getByRole("button");
  const season = (await seasonButtons.nth(1).innerText()).trim();
  await seasonButtons.nth(1).click();
  await expect(page).toHaveURL(new RegExp(`#period-${encodeURIComponent(season)}$`));
  await expect(status).toContainText(`${season} 프로젝트`);

  await page.goto(`/projects#period-${encodeURIComponent(season)}`);
  await expect(page.getByRole("button", { name: season, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );

  const toggle = page.getByRole("button", { name: "자세히 보기" }).first();
  const bodyId = await toggle.getAttribute("aria-controls");
  await expect(page.locator(`#${bodyId}`)).toBeHidden();
  await toggle.click();
  await expect(page.locator(`#${bodyId}`)).toBeVisible();
  await expect(page.locator(`[aria-controls="${bodyId}"]`)).toHaveText("접기");

  // Expanded markdown (tables have a min width) must not widen the page.
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("legacy .html URLs redirect to the new routes", async ({ page }) => {
  await page.goto("/alumni.html");
  await expect(page).toHaveURL(/\/members$/);
  await page.goto("/activities.html#activity-seminar");
  await expect(page).toHaveURL(/\/activities#activity-seminar$/);
});

test("mobile navigation opens, locks scrolling and closes with Escape", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "The menu button only exists on small screens.");
  await page.goto("/about");
  const toggle = page.getByRole("button", { name: "메뉴 열기" });
  await toggle.click();
  const nav = page.getByRole("navigation", { name: "주요 메뉴" });
  await expect(nav).toBeVisible();
  // The last link must be on screen: the menu once collapsed to the header's height.
  await expect(nav.getByRole("link", { name: "Login" })).toBeInViewport();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("hidden");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "주요 메뉴" })).toBeHidden();
});
