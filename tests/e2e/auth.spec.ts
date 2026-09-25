import { expect, test } from "@playwright/test";

test("admin requires a session", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("관리자 로그인");
});

test("a forged session cookie is rejected", async ({ page, context, baseURL }) => {
  await context.addCookies([
    { name: "aiku_session", value: "not-a-valid-token", url: baseURL ?? "http://localhost:3000" },
  ]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong credentials show an error and keep the ID", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("ID").fill("someone");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page.locator("form [role=alert]")).toHaveText(
    /ID 또는 비밀번호가 올바르지 않습니다|로그인 시도가 너무 많습니다/,
  );
  await expect(page.getByLabel("ID")).toHaveValue("someone");
});

test("the cron endpoint rejects requests without the secret", async ({ request }) => {
  const response = await request.get("/api/cron/keepalive");
  expect(response.status()).toBe(401);
});
