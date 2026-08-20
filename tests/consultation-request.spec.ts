import { test, expect } from "@playwright/test";

import { testEmail, trackFailedRequests, trackJsErrors } from "./helpers";

// The submission tests below write to the real Supabase project (no local
// instance is configured — see .env.local), the same as authenticated-flows.spec.ts.
// Each successful submission creates one disposable consultation_requests row,
// tagged via testEmail() and never otherwise touched. See the end-of-run
// report for the cleanup query.
const createdRequestEmails: string[] = [];

test.describe("Consultation Request Intake", () => {
  test("public booking page loads with form and branding", async ({ page }) => {
    await page.goto("/request-consultation");

    // Header and brand logo check
    await expect(page.getByRole("heading", { name: "Request a Consultation" })).toBeVisible();
    await expect(page.getByText("Confidential & Secure")).toBeVisible();

    // Key input fields check
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
    await expect(page.locator('textarea[name="reason"]')).toBeVisible();

    // Mode buttons check
    await expect(page.getByText("Virtual / Telehealth")).toBeVisible();
    await expect(page.getByText("In-Person Clinic")).toBeVisible();
  });

  test("login page provides direct link to consultation request page", async ({ page }) => {
    await page.goto("/login");

    const requestLink = page.locator('a[href="/request-consultation"]');
    await expect(requestLink).toBeVisible();
    await requestLink.click();

    await expect(page).toHaveURL(/.*request-consultation/);
    await expect(page.getByRole("heading", { name: "Request a Consultation" })).toBeVisible();
  });

  test("mode selector switches the hidden preferredMode field", async ({ page }) => {
    await page.goto("/request-consultation");

    const hiddenMode = page.locator('input[name="preferredMode"]');
    await expect(hiddenMode).toHaveValue("flexible");

    await page.getByText("Virtual / Telehealth").click();
    await expect(hiddenMode).toHaveValue("virtual");

    await page.getByText("In-Person Clinic").click();
    await expect(hiddenMode).toHaveValue("in_person");
  });

  test("server-side validation rejects a too-short name and an invalid phone number", async ({ page }) => {
    // fullName and phone carry no client-side length/format constraints
    // (phone is type="tel" with no pattern attribute), so these values
    // reach the server untouched and exercise the zod schema in
    // actions/submit-consultation-request.ts rather than browser validation.
    await page.goto("/request-consultation");

    await page.locator('input[name="fullName"]').fill("A");
    await page.locator('input[name="email"]').fill(testEmail("validation-check"));
    await page.locator('input[name="phone"]').fill("123");

    await page.getByRole("button", { name: "Submit Consultation Request" }).click();

    await expect(page.getByText("Please enter your full name.")).toBeVisible();
    await expect(
      page.getByText("Please enter a valid phone or WhatsApp number (at least 7 digits).")
    ).toBeVisible();

    // Still on the form, not the success screen.
    await expect(page.getByRole("heading", { name: "Request a Consultation" })).toBeVisible();
  });

  test("a fully filled-in request submits successfully and reaches the real database", async ({ page }) => {
    const errors = trackJsErrors(page);
    const failed = trackFailedRequests(page);

    const fullName = `Playwright Test Client ${Date.now()}`;
    const email = testEmail("consultation-request");
    createdRequestEmails.push(email);

    await page.goto("/request-consultation");

    await page.locator('input[name="fullName"]').fill(fullName);
    await page.locator('input[name="email"]').fill(email);
    await page.locator('input[name="phone"]').fill("+15555550123");
    await page.locator('input[name="dob"]').fill("1990-05-14");
    await page.locator('select[name="sex"]').selectOption("female");
    await page.getByText("Virtual / Telehealth").click();
    await page.locator('input[name="preferredTime"]').fill("Weekday afternoons");
    await page
      .locator('textarea[name="reason"]')
      .fill("Playwright end-to-end test submission — safe to disregard/delete.");

    await page.getByRole("button", { name: "Submit Consultation Request" }).click();

    // Confirms the insert actually reached consultation_requests (see
    // actions/submit-consultation-request.ts) rather than silently failing
    // — this is what would catch the table/RLS policy not actually being
    // live in the database despite the migration existing in the repo.
    await expect(page.getByRole("heading", { name: "Request Received!" })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(fullName)).toBeVisible();
    await expect(page.getByRole("link", { name: "Go to Patient Login" })).toBeVisible();

    expect(errors, `Console errors:\n${errors.join("\n")}`).toEqual([]);
    expect(failed, `Failed requests:\n${failed.join("\n")}`).toEqual([]);
  });

  test.afterAll(() => {
    if (createdRequestEmails.length) {
      console.log(
        `\n[cleanup] ${createdRequestEmails.length} disposable consultation_requests row(s) created — emails:\n` +
          createdRequestEmails.map((e) => `  ${e}`).join("\n") +
          "\n[cleanup] Run in the Supabase SQL editor to remove them:\n" +
          `  delete from public.consultation_requests where email in (${createdRequestEmails
            .map((e) => `'${e}'`)
            .join(", ")});\n`
      );
    }
  });
});
