import { test, expect } from "../playwright-fixture";

/**
 * E2E coverage for the Republish Before/After diff view.
 *
 * The realtime republish flow (GeneratedPagesPage) captures a "before"
 * snapshot at trigger time and, once the page transitions to `published`,
 * opens {@link RepublishDiffDialog} with the before/after content. Driving the
 * full backend publish requires an authenticated session + live WordPress
 * site, so this test exercises the exact same dialog through a dev harness
 * route with deterministic fixtures, verifying that both the rendered
 * Before/After previews and the HTML diff render correctly.
 */

const HARNESS = "/__dev/republish-diff";

test.describe("Republish diff view", () => {
  test("renders Before/After previews and a color-coded HTML diff", async ({ page }) => {
    await page.goto(HARNESS);

    // Dialog auto-opens in the harness.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Header reflects the republished page title + change summary badges.
    await expect(dialog.getByText(/Before \/ After/)).toBeVisible();
    await expect(dialog.getByText(/added/)).toBeVisible();
    await expect(dialog.getByText(/removed/)).toBeVisible();

    // Rendered tab: both Before and After previews present.
    await expect(dialog.getByText("Before", { exact: true })).toBeVisible();
    await expect(dialog.getByText("After", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Old Heading")).toBeVisible();
    await expect(dialog.getByText("New Heading")).toBeVisible();

    // Switch to the HTML diff tab and confirm added/removed lines render.
    await dialog.getByRole("tab", { name: "HTML diff" }).click();
    await expect(dialog.getByText(/Old Heading/)).toBeVisible();
    await expect(dialog.getByText(/Freshly added line after republish/)).toBeVisible();
  });

  test("shows the no-changes state when before and after are identical", async ({ page }) => {
    const snap = {
      title: "Same Page",
      external_url: "https://example.com/same",
      content: "<section><h1>Unchanged</h1></section>",
    };
    const encoded = Buffer.from(JSON.stringify(snap)).toString("base64");
    await page.goto(`${HARNESS}?before=${encoded}&after=${encoded}`);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/No content changes detected/)).toBeVisible();

    await dialog.getByRole("tab", { name: "HTML diff" }).click();
    await expect(
      dialog.getByText(/identical before and after this republish/),
    ).toBeVisible();
  });

  test("can be reopened via the harness button after closing", async ({ page }) => {
    await page.goto(`${HARNESS}?open=0`);

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByTestId("open-diff").click();
    await expect(page.getByRole("dialog")).toBeVisible();
  });
});
