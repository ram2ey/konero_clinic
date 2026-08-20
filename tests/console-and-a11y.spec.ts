import { test, expect } from "@playwright/test";

import { trackFailedRequests, trackJsErrors } from "./helpers";

const PUBLIC_PAGES = ["/login", "/forgot-password", "/auth/set-password"];

test.describe("No console errors or failed requests on public pages", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} loads cleanly`, async ({ page }) => {
      const errors = trackJsErrors(page);
      const failedRequests = trackFailedRequests(page);

      await page.goto(path);
      await page.waitForTimeout(1500); // let async effects (e.g. set-password's auth check) settle

      expect(errors, `Console errors on ${path}:\n${errors.join("\n")}`).toEqual([]);
      expect(
        failedRequests,
        `Failed requests on ${path}:\n${failedRequests.join("\n")}`,
      ).toEqual([]);
    });
  }
});

test.describe("Form accessibility", () => {
  test("login inputs are reachable by label and keyboard", async ({ page }) => {
    await page.goto("/login");

    // getByLabel throwing/failing here would mean the <label htmlFor>
    // association broke — the same association screen readers depend on.
    const email = page.getByLabel("Email address");
    const password = page.getByLabel("Password");
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();

    await email.focus();
    await expect(email).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(password).toBeFocused();
  });

  test("forgot-password input is reachable by label", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.getByLabel("Email address")).toBeVisible();
  });
});

test.describe("Responsive layout", () => {
  const viewports = [
    { name: "mobile", width: 375, height: 812 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "desktop", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    test(`login page has no horizontal overflow at ${vp.name} (${vp.width}px)`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/login");

      const { scrollWidth, clientWidth } = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));

      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // +1 for sub-pixel rounding
      await expect(page.getByRole("button", { name: "Sign in to Portal" })).toBeVisible();
    });
  }
});
