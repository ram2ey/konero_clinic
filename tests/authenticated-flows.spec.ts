import { test, expect, type Page, type BrowserContext } from "@playwright/test";

import { fillCombobox, openAccordionSection, testEmail, trackFailedRequests, trackJsErrors } from "./helpers";

// Everything behind sign-in, end to end, against the real project (no
// local Supabase instance is configured — see .env.local). Requires
// PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD as env vars (never
// hard-coded here, never written to a committed file) — the whole file is
// skipped when they're absent, so a normal `npx playwright test` run by
// anyone else doesn't fail for lacking credentials to the one real admin
// account this schema allows.
//
// Creates exactly one disposable patient (see TEST_PATIENT_NAME /
// TEST_PATIENT_EMAIL below) and two consultations on it. Nothing else is
// written. See the end-of-run report for the cleanup query.
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

test.describe.configure({ mode: "serial" });

test.describe("Authenticated flows", () => {
  test.skip(!ADMIN_EMAIL || !ADMIN_PASSWORD, "Set PLAYWRIGHT_ADMIN_EMAIL / PLAYWRIGHT_ADMIN_PASSWORD to run this suite.");

  // The consultation form's catalogue comboboxes render their dropdown
  // via a portal at position: fixed, computed from the input's on-screen
  // position when it opens. With several accordion sections expanded at
  // once, an input can sit below the default ~720px viewport height —
  // and a fixed-position dropdown that ends up below the viewport can't
  // be scrolled into view (scrolling the page doesn't move fixed
  // elements), which fails the click as "outside of the viewport". A
  // taller viewport keeps every section's controls actually reachable
  // instead of working around it per-section.
  test.use({ viewport: { width: 1400, height: 2400 } });

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const TEST_PATIENT_NAME = `Playwright Test Patient ${runId}`;
  const TEST_PATIENT_EMAIL = testEmail(`patient-${runId}`);

  let context: BrowserContext;
  let page: Page;
  let patientId = "";
  let registrationTempPassword = "";
  let resetTempPassword = "";
  let patientNewPassword = "";

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test("admin can sign in", async () => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(ADMIN_EMAIL!);
    await page.getByLabel("Password").fill(ADMIN_PASSWORD!);
    await page.getByRole("button", { name: "Sign in to Portal" }).click();

    await expect(page).toHaveURL(/\/admin$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Clinical Administration & Insights" })).toBeVisible();
  });

  test("admin nav pages all load without console or network errors", async () => {
    const navPages = [
      { href: "/admin", label: "Dashboard" },
      { href: "/admin/consultations", label: "Consultations" },
      { href: "/admin/billing", label: "Billing" },
      { href: "/admin/lab-reports", label: "Lab Reports" },
      { href: "/admin/settings", label: "Settings" },
    ];

    for (const item of navPages) {
      const errors = trackJsErrors(page);
      const failed = trackFailedRequests(page);
      const urlPattern = new RegExp(`${item.href.replace(/\//g, "\\/")}$`);
      await Promise.all([
        page.waitForURL(urlPattern, { timeout: 10000 }),
        page.getByRole("link", { name: item.label, exact: true }).click(),
      ]);
      await page.waitForTimeout(800);
      expect(errors, `Console errors on ${item.href}:\n${errors.join("\n")}`).toEqual([]);
      expect(failed, `Failed requests on ${item.href}:\n${failed.join("\n")}`).toEqual([]);
    }
  });

  test("admin can register a disposable test patient and receives a temp password", async () => {
    await page.goto("/admin/consultations/new");

    await page.getByLabel("Full name", { exact: false }).fill(TEST_PATIENT_NAME);
    await page.locator("#dob").fill("1990-05-14");
    await page.locator("#sex").selectOption("male");
    await page.locator("#email").fill(TEST_PATIENT_EMAIL);
    await page.locator("#phone").fill("+15555550123");

    await page.getByRole("button", { name: "Register patient" }).click();

    await expect(page.getByText(`${TEST_PATIENT_NAME} can now sign in.`)).toBeVisible({ timeout: 15000 });

    const passwordCode = page.locator("code");
    await expect(passwordCode).toBeVisible();
    registrationTempPassword = (await passwordCode.textContent())?.trim() ?? "";
    expect(registrationTempPassword.length).toBeGreaterThanOrEqual(10);

    await page.getByRole("link", { name: "Back to patients" }).click();
    await expect(page).toHaveURL(/\/admin\/consultations$/);

    // Search to find the just-created patient and capture their id from
    // the folder URL — the success screen itself has no direct link.
    await page.getByPlaceholder("Search by patient name...").fill(TEST_PATIENT_NAME);
    await page.getByRole("button", { name: "Search" }).click();
    const patientLink = page.getByRole("link", { name: new RegExp(TEST_PATIENT_NAME) });
    await expect(patientLink).toBeVisible();
    const href = await patientLink.getAttribute("href");
    patientId = href?.split("/").pop() ?? "";
    expect(patientId).toMatch(/^[0-9a-f-]{36}$/);
  });

  test("first-visit consultation: catalogue pickers, ICD-11 diagnosis, and clerking history", async () => {
    await page.goto(`/admin/consultations/${patientId}/new`);

    // count === 0 for a brand-new patient, so this should default to
    // "1st Visit" (see suggestedVisitType in app/.../[id]/new/page.tsx).
    await expect(page.getByRole("button", { name: "1st Visit" })).toHaveAttribute("aria-pressed", "true");

    // History — the full clerking template, first-visit only.
    const historySection = await openAccordionSection(page, /^History\b/);
    await historySection.getByRole("textbox", { name: "1. Presenting Complaint(s)" }).fill("Low mood for two weeks.");
    await historySection
      .getByRole("textbox", { name: "2. History of Presenting Complaint(s)" })
      .fill("Gradual onset, no clear precipitant. Playwright regression check.");

    // Diagnosis — ICD-11 catalogue combobox.
    //
    // Role-scoped, not getByLabel: Radix gives the accordion's content
    // <div role="region"> an aria-labelledby pointing at the trigger, so
    // its accessible name is also "Diagnosis / Differential Diagnosis" —
    // getByLabel("Diagnosis") matches that region AND the "Remove
    // diagnosis" button (substring) AND the actual input, three-way
    // ambiguous. role="combobox"/"textbox" excludes the region (role
    // "region") and the remove button (role "button") outright.
    const diagnosesSection = await openAccordionSection(page, "Diagnosis / Differential Diagnosis");
    await diagnosesSection.getByRole("button", { name: "Add" }).click();
    await fillCombobox(diagnosesSection.getByRole("combobox", { name: "Diagnosis" }), "depress");
    const diagnosisOption = page.getByRole("option").filter({ hasText: "Depressive disorders, unspecified" });
    await expect(diagnosisOption).toBeVisible({ timeout: 8000 });
    await diagnosisOption.click();
    await expect(diagnosesSection.getByText("6A7Z")).toBeVisible();

    // Medications — the new medications catalogue, strength auto-fill.
    const medsSection = await openAccordionSection(page, "Medications");
    await medsSection.getByRole("button", { name: "Add" }).click();
    await fillCombobox(medsSection.getByRole("combobox", { name: "Medication name" }), "olanz");
    const medOption = page.getByRole("option").filter({ hasText: "Olanzapine" });
    await expect(medOption).toBeVisible({ timeout: 8000 });
    await medOption.click();
    // A single-strength medicine should auto-fill dosage rather than
    // leave it for the doctor to retype (see selectMedication in
    // record-consultation-form.tsx).
    //
    // Plain attribute selectors here, not getByRole: Frequency carries a
    // `list` attribute (for its suggestions datalist), and per HTML-AAM
    // that maps its implicit ARIA role to "combobox", not "textbox" — a
    // role-based locator for it would silently match nothing.
    await expect(medsSection.locator('input[aria-label="Dosage"]')).toHaveValue("10 mg in vial");
    await medsSection.locator('input[aria-label="Frequency"]').fill("Nocte (at night)");

    // Investigations — one catalogue covering labs, imaging, and
    // procedures alike (see the seed migrations under supabase/migrations),
    // matched by alias. Two rows here: one lab test, one imaging study, to
    // prove both categories are actually searchable and selectable, not
    // just the lab side that existed before.
    const investigationsSection = await openAccordionSection(page, "Investigations");
    await investigationsSection.getByRole("button", { name: "Add" }).click();
    const investigationInputs = investigationsSection.getByRole("combobox", { name: "Investigation" });
    await fillCombobox(investigationInputs.nth(0), "fbc");
    const labOption = page.getByRole("option").filter({ hasText: "Full blood count" });
    await expect(labOption).toBeVisible({ timeout: 8000 });
    await labOption.click();
    await expect(investigationInputs.nth(0)).toHaveValue("Full blood count");

    await investigationsSection.getByRole("button", { name: "Add" }).click();
    await fillCombobox(investigationInputs.nth(1), "MRI brain");
    const mriOption = page.getByRole("option").filter({ hasText: "MRI Brain" });
    await expect(mriOption).toBeVisible({ timeout: 8000 });
    await mriOption.click();
    await expect(investigationInputs.nth(1)).toHaveValue("MRI Brain");

    // Summary — enough to make the saved record legible when reviewed
    // below. Same region-name collision as above: the Summary section's
    // <textarea> and its own accordion-content region are BOTH
    // exactly-named "Summary", so even exact:true can't disambiguate a
    // getByLabel call here — role="textbox" is what actually excludes
    // the region.
    const summarySection = await openAccordionSection(page, "Summary");
    await summarySection
      .getByRole("textbox", { name: "Summary" })
      .fill("Playwright end-to-end test consultation (first visit).");

    await page.getByRole("button", { name: "Save consultation" }).click();
    // Not matching ?recorded=1 here: SuccessBanner (see
    // components/admin/success-banner.tsx) reads that query param and
    // strips it via history.replaceState within its first effect,
    // typically before this assertion's first poll — asserting on it
    // would be racing a UI behaviour that's supposed to be fast. The
    // stable signal is the base folder URL; "Consultation recorded." is
    // checked separately below, from the banner's persisted component
    // state rather than the URL.
    await expect(page).toHaveURL(new RegExp(`/admin/consultations/${patientId}$`), { timeout: 15000 });
  });

  test("the saved first-visit consultation renders diagnosis, medication, and lab order", async () => {
    await page.getByRole("tab", { name: "Consultation" }).click();
    // Both the Overview and Consultation tabpanels are forceMount'd (see
    // patient-folder-view.tsx) and both can end up showing this same
    // diagnosis, so an unscoped page.getByText would be ambiguous —
    // scoping to the active tabpanel is what actually disambiguates them.
    const consultationTab = page.getByRole("tabpanel", { name: "Consultation" });
    await expect(consultationTab.getByText("Consultation recorded.")).toBeVisible();

    // Single consultation so far — PreviousConsultationsList auto-expands it.
    await expect(consultationTab.getByText("Depressive disorders, unspecified")).toBeVisible();
    await expect(consultationTab.getByText("Olanzapine")).toBeVisible();
    await expect(consultationTab.getByText("Full blood count")).toBeVisible();
    await expect(consultationTab.getByText("MRI Brain")).toBeVisible();
  });

  test("review visit shows a single interval-history field, not the full template", async () => {
    // "New consultation" is a <Button asChild><Link>…</Link></Button> —
    // Radix's asChild merges the Button's props onto the Link, so the
    // rendered element is the Link's own <a>, with role="link", not
    // "button". Same trap as the sidebar nav links, just missed here.
    await page.getByRole("link", { name: "New consultation" }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/consultations/${patientId}/new$`));

    // count > 0 now — should default to "Review".
    await expect(page.getByRole("button", { name: "Review" })).toHaveAttribute("aria-pressed", "true");

    const intervalSection = await openAccordionSection(page, /Interval History/);
    const intervalField = intervalSection.getByRole("textbox", { name: "Progress since last visit" });
    await expect(intervalField).toBeVisible();

    // The destructive path must not even be present in the DOM on a
    // review visit — this is the regression check for the fix that keeps
    // recordConsultation from upserting patient_history on a review.
    await expect(page.getByRole("textbox", { name: "1. Presenting Complaint(s)" })).toHaveCount(0);

    await intervalField.fill("Playwright regression check: mood improved, sleeping better.");

    await page.getByRole("button", { name: "Save consultation" }).click();
    // Not matching ?recorded=1 here: SuccessBanner (see
    // components/admin/success-banner.tsx) reads that query param and
    // strips it via history.replaceState within its first effect,
    // typically before this assertion's first poll — asserting on it
    // would be racing a UI behaviour that's supposed to be fast. The
    // stable signal is the base folder URL; "Consultation recorded." is
    // checked separately below, from the banner's persisted component
    // state rather than the URL.
    await expect(page).toHaveURL(new RegExp(`/admin/consultations/${patientId}$`), { timeout: 15000 });
  });

  test("the review visit's progress note renders, and the full history survives untouched", async () => {
    await page.getByRole("tab", { name: "Consultation" }).click();
    const consultationTab = page.getByRole("tabpanel", { name: "Consultation" });
    await expect(consultationTab.getByText("Consultation recorded.")).toBeVisible();

    // Two consultations now — expand the one carrying the "Review" badge.
    const reviewCard = consultationTab
      .locator('[data-slot="card"]')
      .filter({ has: page.getByText("Review", { exact: true }) });
    await reviewCard.getByRole("button", { name: /View notes/ }).click();
    await expect(reviewCard.getByText("Progress Since Last Visit")).toBeVisible();
    await expect(
      reviewCard.getByText("Playwright regression check: mood improved, sleeping better."),
    ).toBeVisible();

    // The bug this run found and fixed: the "History tab" link the review
    // section points to previously redirected into a tab with no history
    // content at all. Confirms it now actually shows what was recorded at
    // the first visit — and, more importantly, that the review visit did
    // not overwrite it.
    await page.getByRole("tab", { name: "History" }).click();
    const historyTab = page.getByRole("tabpanel", { name: "History" });
    await expect(historyTab.getByText("Low mood for two weeks.")).toBeVisible({ timeout: 8000 });
    await expect(
      historyTab.getByText("Gradual onset, no clear precipitant. Playwright regression check."),
    ).toBeVisible();
  });

  test("admin can issue a new temporary password for the patient", async () => {
    await page.getByRole("button", { name: "Reset Password" }).click();
    const passwordCode = page.locator("code");
    await expect(passwordCode).toBeVisible({ timeout: 10000 });
    resetTempPassword = (await passwordCode.textContent())?.trim() ?? "";
    expect(resetTempPassword.length).toBeGreaterThanOrEqual(10);
    expect(resetTempPassword).not.toBe(registrationTempPassword);
  });

  test("admin signs out", async ({ browser }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Fresh browser context for the rest of the suite, not just a
    // sign-out: this same `page` just browsed /admin repeatedly as the
    // doctor_admin. Next.js's client-side router cache can serve a
    // recently-visited route's RSC payload without a fresh server
    // request, which would bypass middleware entirely for that soft
    // navigation — not a real risk for an actual patient (who has never
    // had an admin session in their browser), but a genuine trap for a
    // test that reuses one context across both identities. A new context
    // has no router cache to serve stale from, matching how a real
    // patient's first sign-in actually behaves.
    await context.close();
    context = await browser.newContext({ viewport: { width: 1400, height: 2400 } });
    page = await context.newPage();
  });

  test("the temp password forces a password change before reaching the portal", async () => {
    await page.goto("/login");
    await page.getByLabel("Email address").fill(TEST_PATIENT_EMAIL);
    await page.getByLabel("Password").fill(resetTempPassword);
    await page.getByRole("button", { name: "Sign in to Portal" }).click();

    // Not /portal, and not even a brief flash of /admin — actions/sign-in.ts
    // checks must_change_password itself and redirects here directly. (It
    // has to: middleware's identical check is a real backstop for every
    // other kind of navigation, but a Server Action's own redirect() wins
    // over one middleware issues for that same fetch, since the target is
    // communicated to the client through the action's response payload,
    // not a plain HTTP Location header.)
    await expect(page).toHaveURL(/\/auth\/set-password$/, { timeout: 15000 });
    await expect(page.getByRole("heading", { name: "Set your password" })).toBeVisible();

    patientNewPassword = "Pw-" + Math.random().toString(36).slice(2, 10) + "!Aa1";
    await page.getByLabel("New password").fill(patientNewPassword);
    await page.getByLabel("Confirm password").fill(patientNewPassword);
    await page.getByRole("button", { name: "Set password" }).click();

    await expect(page).toHaveURL(/\/portal$/, { timeout: 15000 });
  });

  test("the patient portal shows the recorded diagnosis and medication", async () => {
    // Medications/Diagnoses/etc. are separate tabs here too (see
    // app/portal/page.tsx), each forceMount'd — "Overview" is the default
    // active one, so these two are only actually visible once selected.
    await page.getByRole("tab", { name: "Medications" }).click();
    await expect(page.getByRole("tabpanel", { name: "Medications" }).getByText("Olanzapine")).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("tab", { name: "Diagnoses" }).click();
    await expect(
      page.getByRole("tabpanel", { name: "Diagnoses" }).getByText("Depressive disorders, unspecified"),
    ).toBeVisible();
  });

  test("signing in again with the new password goes straight to the portal", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email address").fill(TEST_PATIENT_EMAIL);
    await page.getByLabel("Password").fill(patientNewPassword);
    await page.getByRole("button", { name: "Sign in to Portal" }).click();

    // If must_change_password were never actually cleared, this would
    // loop back to /auth/set-password despite the password being correct
    // — the exact failure mode the flag-clearing action exists to prevent.
    await expect(page).toHaveURL(/\/portal$/, { timeout: 15000 });
  });

  test.afterAll(async () => {
    if (patientId) {
      console.log(`\n[cleanup] Disposable test patient created — id: ${patientId}, email: ${TEST_PATIENT_EMAIL}`);
      console.log(
        "[cleanup] Run in the Supabase SQL editor to remove it and its two test consultations:\n" +
          `  delete from public.diagnoses where patient_id = '${patientId}';\n` +
          `  delete from public.prescriptions where patient_id = '${patientId}';\n` +
          `  delete from public.patient_history where patient_id = '${patientId}';\n` +
          `  delete from public.consultations where patient_id = '${patientId}';\n` +
          `  delete from auth.users where id = '${patientId}';\n`,
      );
    }
  });
});
