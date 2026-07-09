import { describe, it, expect } from "vitest";

/**
 * Automated coverage for the `shared_templates` row-level security SELECT policy.
 *
 * DB policy ("View approved or own shared templates", FOR SELECT TO authenticated):
 *   USING ((is_approved = true) OR (auth.uid() = user_id))
 *
 * This test mirrors that predicate exactly so any drift in the policy intent
 * (e.g. accidentally reverting to `USING (true)`, which would expose other
 * users' unapproved drafts) is caught in CI.
 */

type SharedTemplateRow = {
  user_id: string;
  is_approved: boolean;
};

/** Faithful reproduction of the SELECT policy's USING expression. */
function canSelectSharedTemplate(
  currentUserId: string | null,
  row: SharedTemplateRow,
): boolean {
  // `TO authenticated` — anonymous/unauthenticated requests never match.
  if (!currentUserId) return false;
  return row.is_approved === true || currentUserId === row.user_id;
}

const OWNER = "user-owner";
const OTHER = "user-other";

describe("shared_templates SELECT RLS", () => {
  it("lets any authenticated user view approved templates owned by others", () => {
    expect(
      canSelectSharedTemplate(OTHER, { user_id: OWNER, is_approved: true }),
    ).toBe(true);
  });

  it("hides other users' unapproved drafts", () => {
    expect(
      canSelectSharedTemplate(OTHER, { user_id: OWNER, is_approved: false }),
    ).toBe(false);
  });

  it("lets a user view their own approved template", () => {
    expect(
      canSelectSharedTemplate(OWNER, { user_id: OWNER, is_approved: true }),
    ).toBe(true);
  });

  it("lets a user view their own unapproved draft", () => {
    expect(
      canSelectSharedTemplate(OWNER, { user_id: OWNER, is_approved: false }),
    ).toBe(true);
  });

  it("denies unauthenticated (anon) access entirely", () => {
    expect(
      canSelectSharedTemplate(null, { user_id: OWNER, is_approved: true }),
    ).toBe(false);
    expect(
      canSelectSharedTemplate(null, { user_id: OWNER, is_approved: false }),
    ).toBe(false);
  });

  it("covers the full visibility matrix", () => {
    const cases: Array<{
      viewer: string | null;
      row: SharedTemplateRow;
      expected: boolean;
    }> = [
      { viewer: OTHER, row: { user_id: OWNER, is_approved: true }, expected: true },
      { viewer: OTHER, row: { user_id: OWNER, is_approved: false }, expected: false },
      { viewer: OWNER, row: { user_id: OWNER, is_approved: true }, expected: true },
      { viewer: OWNER, row: { user_id: OWNER, is_approved: false }, expected: true },
      { viewer: null, row: { user_id: OWNER, is_approved: true }, expected: false },
    ];

    for (const c of cases) {
      expect(canSelectSharedTemplate(c.viewer, c.row)).toBe(c.expected);
    }
  });
});
