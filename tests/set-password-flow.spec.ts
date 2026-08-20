import { test, expect } from "@playwright/test";

test.describe("Set password (invalid / expired link states)", () => {
  test("an error param in the URL shows the invalid-link state immediately", async ({ page }) => {
    await page.goto(
      "/auth/set-password?error=access_denied&error_description=Link+has+expired",
    );

    await expect(page.getByText("Link Expired or Invalid")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("Link has expired")).toBeVisible();
    await expect(page.getByRole("link", { name: "Request New Reset Link" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Return to Sign In" })).toBeVisible();
  });

  test("visiting with no session and no link data eventually shows invalid", async ({ page }) => {
    await page.goto("/auth/set-password");

    // No error param and no fragment session — the page waits ~4s
    // (see the timeout in app/auth/set-password/page.tsx) before
    // concluding the link never resolved to a session.
    await expect(page.getByText("Verifying your link…")).toBeVisible();
    await expect(page.getByText("Link Expired or Invalid")).toBeVisible({ timeout: 6000 });
    await expect(page.getByText(/invalid or has expired/i)).toBeVisible();
  });

  test("Request New Reset Link goes to /forgot-password", async ({ page }) => {
    await page.goto("/auth/set-password?error=access_denied&error_description=expired");
    await page.getByRole("link", { name: "Request New Reset Link" }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
  });
});
