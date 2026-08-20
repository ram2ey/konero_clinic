import type { Page } from "@playwright/test";

// .invalid is reserved by RFC 2606: guaranteed to never resolve, so
// nothing generated here can ever reach a real inbox or a real account.
export function testEmail(label: string) {
  return `playwright-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.invalid`;
}

// Console text for a failed resource load never includes the URL — Chrome
// logs that separately — so it can't be filtered by pattern here. Real
// network failures are caught precisely via trackFailedRequests instead;
// this only tracks genuine JS errors and uncaught exceptions.
export function trackJsErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error" && !/^Failed to load resource:/.test(msg.text())) {
      errors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

const IGNORED_URL_PATTERNS = [
  /\/favicon\.ico$/,
  /\/_next\//,
  /\.map$/,
  /__nextjs/,
  /\/__vercel/,
];

export function trackFailedRequests(page: Page) {
  const failed: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400 && !IGNORED_URL_PATTERNS.some((p) => p.test(response.url()))) {
      failed.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    // ERR_ABORTED is the browser cancelling a request it started itself —
    // most commonly an RSC prefetch superseded by the click navigation
    // that follows it. That's normal App Router behaviour, not a broken
    // request, so it's excluded regardless of URL.
    const errorText = request.failure()?.errorText;
    if (errorText === "net::ERR_ABORTED") return;
    if (!IGNORED_URL_PATTERNS.some((p) => p.test(request.url()))) {
      failed.push(`(failed) ${request.url()} — ${errorText}`);
    }
  });
  return failed;
}

/**
 * Opens (if not already open) the accordion section whose trigger matches
 * `name`, and returns a locator scoped to that whole section — both
 * trigger and content — so callers can find fields, "Add" buttons, etc.
 * without colliding with same-named controls in other sections.
 */
export function accordionSection(page: Page, name: string | RegExp) {
  const item = page.locator('[data-slot="accordion-item"]').filter({ has: page.getByRole("button", { name }) });
  return item;
}

/**
 * Types a catalogue-combobox query only after scrolling the input fully
 * into view. The dropdown is a portal at position: fixed, positioned
 * once (via getBoundingClientRect) at the moment it opens — if the input
 * isn't actually on-screen yet, the dropdown opens off-screen too, and a
 * fixed-position element that ends up below the viewport can't be
 * scrolled into view afterwards (scrolling the page doesn't move fixed
 * elements). A tall test viewport reduces how often this happens but
 * doesn't eliminate it for a form with this many optional sections —
 * scrolling explicitly before typing does.
 */
export async function fillCombobox(input: import("@playwright/test").Locator, query: string) {
  await input.scrollIntoViewIfNeeded();
  await input.fill(query);
}

export async function openAccordionSection(page: Page, name: string | RegExp) {
  const item = accordionSection(page, name);
  const trigger = item.getByRole("button", { name });
  if ((await trigger.getAttribute("data-state")) !== "open") {
    await trigger.click();
  }
  return item;
}
