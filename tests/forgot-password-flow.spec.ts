import { test, expect } from "@playwright/test";

import { testEmail } from "./helpers";

test.describe("Forgot password", () => {
  test("valid-looking email shows the generic success message", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email address").fill(testEmail("forgot"));
    await page.getByRole("button", { name: "Send reset link" }).click();

    // actions/forgot-password.ts always returns the same message whether
    // or not the address is registered, to avoid leaking which emails
    // have accounts.
    await expect(page.getByRole("status")).toContainText(
      "If an account exists for that email, a password reset link has been sent.",
      { timeout: 15000 },
    );
  });

  test("malformed email is blocked before submission", async ({ page }) => {
    await page.goto("/forgot-password");
    const emailInput = page.getByLabel("Email address");
    await emailInput.fill("not-an-email");
    await page.getByRole("button", { name: "Send reset link" }).click();

    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/forgot-password$/);
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test("back to sign in link returns to /login", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByRole("link", { name: "Back to sign in" }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
