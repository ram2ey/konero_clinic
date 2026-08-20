import { test, expect } from "@playwright/test";

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
});
