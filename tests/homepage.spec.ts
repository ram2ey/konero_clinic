import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("login page renders with branding and form", async ({ page }) => {
    await page.goto("/login");

    // Expect the login heading and inputs to be visible
    await expect(page.locator("text=Sign in")).toBeVisible();
    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
  });
});
