import { test, expect } from "@playwright/test";

test.describe("Public pages", () => {
  test("home redirects to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("login page renders with branding and form", async ({ page }) => {
    await page.goto("/login");

    await expect(page).toHaveTitle(/Konero Clinic/);
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in to Portal" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Forgot password?" })).toBeVisible();
  });

  test("forgot password page renders", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(page.getByRole("heading", { name: "Reset password" })).toBeVisible();
    await expect(page.getByLabel("Email address")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
  });

  test("unknown route renders Next's not-found page, not a crash", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-xyz");
    expect(response?.status()).toBe(404);
  });
});
