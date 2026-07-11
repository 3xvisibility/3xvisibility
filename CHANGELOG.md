# Changelog

All notable, reversible UI/feature changes are documented here so they can be
audited and reverted easily.

## [Unreleased]

### Security
- **Sensitive column exposure fixes (column-level GRANT hardening).**
  Table-level `SELECT` was revoked from `anon`/`authenticated` on four tables and
  re-granted only on their non-secret columns, so secret columns are reachable
  only via `service_role`. See `docs/SECURITY-COLUMN-PERMISSIONS.md`.
  - Migration (all four findings): `supabase/migrations/20260710200515_77878fb0-1ee1-4931-a081-c6a884461a5d.sql`
  - Regression tests (verify all four stay fixed):
    - `scripts/security/check-sensitive-grants.mjs` (runner, `npm run test:security`)
    - `src/test/sensitive-grants-regression.test.ts` (vitest guard)
    - `scripts/security/sensitive-fields.mjs` (expectations config / source of truth)
    - CI: `.github/workflows/security-regression.yml`

  | Finding | Hidden column(s) | Fixed by migration | Verified by |
  | --- | --- | --- | --- |
  | `shopify_connections_access_token_exposure` | `shopify_connections.access_token` | `20260710200515_77878fb0-…` | `check-sensitive-grants.mjs` + `sensitive-grants-regression.test.ts` (`shopify_connections.access_token: not readable by anon/authenticated`) |
  | `subscriptions_stripe_ids_exposure` | `subscriptions.stripe_customer_id`, `subscriptions.stripe_subscription_id` | `20260710200515_77878fb0-…` | `check-sensitive-grants.mjs` + `sensitive-grants-regression.test.ts` (`subscriptions.stripe_customer_id` / `stripe_subscription_id` cases) |
  | `webhook_endpoints_secret_exposure` | `webhook_endpoints.secret` | `20260710200515_77878fb0-…` | `check-sensitive-grants.mjs` + `sensitive-grants-regression.test.ts` (`webhook_endpoints.secret` cases) |
  | `websites_credentials_exposure` | `websites.credentials`, `websites.google_service_account` | `20260710200515_77878fb0-…` | `check-sensitive-grants.mjs` + `sensitive-grants-regression.test.ts` (`websites.credentials` / `google_service_account` cases) |

- **`admin-panel` edge function: stop returning secret columns to the client.**
  Replaced three `select("*")` queries (get-stats subscriptions; user-detail
  subscription and websites) with explicit non-secret column lists, so
  `stripe_customer_id`, `stripe_subscription_id`, `credentials`, and
  `google_service_account` are no longer sent to the admin UI.
  - File: `supabase/functions/admin-panel/index.ts`
  - Verified: audited all DB views/functions and every `.from()` query in `src/`
    and `supabase/functions/` for these columns; `get_shopify_access_token`
    EXECUTE remains restricted to `service_role`/`postgres`.


### Removed
- **Create Campaign → Mapping step: "How Mapping Works" intro section.**
  - File: `src/components/campaigns/MappingStep.tsx`
  - What: The instructional intro block (previously rendered above the
    "Variable Mapping" header) explaining how CSV columns map to template
    variables. It was removed at the user's request to declutter the step.
  - Why: Redundant — inline tooltips and the unmapped-variable alert already
    cover the same guidance.
  - How to revert: Re-add an intro block immediately before the
    `{/* Header */}` comment (around the `return (` of the mapping panel).
    The block was a static card with a heading "How Mapping Works" and a short
    list describing: (1) pick a CSV column or custom value per variable,
    (2) optionally map to a CMS target field, (3) optionally apply a transform.
    Alternatively, restore via the chat History tab to the version prior to
    this change.

### Verified
- Mapping step is responsive: mobile uses a stacked `flex-col` layout, desktop
  uses `sm:grid`; overflow is guarded with `overflow-hidden`, `min-w-0`,
  `truncate`, and `flex-wrap`. No text overflow or gaps on mobile/desktop.
- Confirmed "How Mapping Works" no longer renders anywhere in the codebase.
