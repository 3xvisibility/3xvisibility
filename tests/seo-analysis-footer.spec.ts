import { test, expect } from "../playwright-fixture";

/**
 * E2E coverage for the SEO Analysis dialog's pinned footer.
 *
 * {@link SeoAnalysisDialog} renders the "AI Fix All Issues" button in a
 * `shrink-0` footer that sits outside the scrollable dialog body. This test
 * drives the real dialog through a dev harness route (with a deliberately
 * low-scoring page so the footer button is present) and verifies the button
 * stays visible and clickable while the body is scrolled to the bottom.
 */

const HARNESS = "/__dev/seo-analysis";

test.describe("SEO Analysis dialog pinned footer", () => {
  test("keeps the AI Fix All Issues button visible while scrolling", async ({ page }) => {
    await page.goto(HARNESS);

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const fixButton = dialog.getByRole("button", { name: /AI Fix All Issues/i });
    await expect(fixButton).toBeVisible();

    // Record the footer button position before scrolling.
    const beforeBox = await fixButton.boundingBox();
    expect(beforeBox).not.toBeNull();

    // Scroll the dialog body all the way down.
    const scrollBody = dialog.locator("div.overflow-y-auto").first();
    await scrollBody.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    await page.waitForTimeout(200);

    // The pinned footer button must still be visible and in the same place.
    await expect(fixButton).toBeVisible();
    await expect(fixButton).toBeInViewport();

    const afterBox = await fixButton.boundingBox();
    expect(afterBox).not.toBeNull();
    // The footer is pinned, so its vertical position should not shift.
    expect(Math.abs((afterBox!.y) - (beforeBox!.y))).toBeLessThan(2);

    // And it must remain clickable (not obscured / covered by scrolled content).
    await expect(fixButton).toBeEnabled();
    await fixButton.click({ trial: true });
  });
});
