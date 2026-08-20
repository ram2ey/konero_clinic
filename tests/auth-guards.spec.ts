import { test, expect } from "@playwright/test";

// middleware.ts redirects any unauthenticated request under /admin or
// /portal to /login?redirect_to=<original path>. These run with no stored
// session (each Playwright test gets a fresh browser context), so they
// exercise exactly that guard rather than any page-level logic.
test.describe("Route protection (unauthenticated)", () => {
  const protectedRoutes = [
    "/admin",
    "/admin/consultations",
    "/admin/consultations/new",
    "/admin/lab-reports",
    "/admin/settings",
    "/portal",
  ];

  for (const route of protectedRoutes) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route);

      const url = new URL(page.url());
      expect(url.pathname).toBe("/login");
      expect(url.searchParams.get("redirect_to")).toBe(route);

      await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    });
  }

  test("/auth/set-password is reachable without a session (not guarded)", async ({ page }) => {
    // Deliberately not in protectedRoutes above: middleware must exempt
    // /auth/* or the must-change-password redirect (see middleware.ts)
    // would loop against the login guard for a signed-out visitor too.
    const response = await page.goto("/auth/set-password");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveURL(/\/auth\/set-password$/);
  });
});
