import { test, expect, type Page } from "@playwright/test";

import { testEmail } from "./helpers";

// Runs against a dev server backed by a real Postgres (export DATABASE_URL
// before the run). It deliberately never touches the real admin's email —
// testEmail() generates an @example.invalid address per call (RFC 2606
// reserves that TLD to never resolve), and a fresh one per test avoids
// order-dependence under the config's fullyParallel: true.

async function attemptLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in to Portal" }).click();

  // Scoped to <main>: Next.js's dev-tools overlay renders its own,
  // permanently-present, empty role="alert" live region as a sibling of
  // <main> (for announcing compile errors) — an unscoped getByRole("alert")
  // matches that one instead of the app's error box and resolves
  // immediately with empty text, well before the real response lands.
  const alert = page.locator("main").getByRole("alert");
  await expect(alert).toBeVisible({ timeout: 15000 });
  await expect(alert).not.toHaveText("", { timeout: 15000 });
  return alert.textContent();
}

test.describe("Sign-in", () => {
  test("wrong credentials show a generic error, not a specific one", async ({ page }) => {
    const message = await attemptLogin(page, testEmail("wrong-creds"), "not-the-right-password");

    // actions/sign-in.ts deliberately returns the same message whether the
    // email exists or not, to avoid letting this endpoint enumerate
    // registered accounts.
    expect(message).toContain("Invalid email or password");
    expect(message?.toLowerCase()).not.toContain("not found");
    expect(message?.toLowerCase()).not.toContain("no account");

    // Still on /login — no session was created.
    await expect(page).toHaveURL(/\/login$/);
  });

  test("browser blocks a malformed email before the form ever submits", async ({ page }) => {
    await page.goto("/login");
    const emailInput = page.getByLabel("Email address");
    await emailInput.fill("not-an-email");
    await page.getByLabel("Password").fill("whatever");
    await page.getByRole("button", { name: "Sign in to Portal" }).click();

    // type="email" + required is native HTML5 validation — the browser
    // refuses to submit, so we should still be on /login with no
    // server round trip having happened at all.
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/\/login$/);
    const isValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
    expect(isValid).toBe(false);
  });

  test("repeated failed attempts trigger the app-level lockout", async ({ page }) => {
    test.setTimeout(90000);

    // MAX_FAILED_ATTEMPTS in actions/sign-in.ts is 5 — the 6th attempt for
    // the same email within the 15-minute window should be rejected
    // before the password is even checked.
    const email = testEmail("lockout");
    let lastMessage = "";
    for (let i = 0; i < 6; i++) {
      lastMessage = (await attemptLogin(page, email, `wrong-password-${i}`)) ?? "";
    }

    expect(lastMessage.toLowerCase()).toContain("too many failed attempts");
  });
});
