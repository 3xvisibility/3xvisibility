/**
 * Single source of truth for sensitive-field security expectations.
 *
 * This declares which public tables hold secret columns that must NEVER be
 * readable by the `anon` or `authenticated` Postgres roles (only `service_role`,
 * used by trusted edge functions/admin code), and which tables must keep
 * Row-Level Security enabled.
 *
 * Both the CI/post-migration runner (`check-sensitive-grants.mjs`) and the
 * vitest guard (`src/test/sensitive-grants-regression.test.ts`) consume this
 * file, so adding a new sensitive column here automatically extends the
 * regression coverage everywhere.
 *
 * When a migration adds a new sensitive column, add it here and grant column
 * -level SELECT to the non-secret columns instead of re-granting table-level
 * SELECT (see @security-memory).
 */

/**
 * @typedef {Object} TableExpectation
 * @property {string} table              Public table name.
 * @property {boolean} requireRls        RLS must be enabled on the table.
 * @property {string[]} secretColumns    Columns that anon + authenticated must NOT be able to SELECT.
 */

/** @type {TableExpectation[]} */
export const SENSITIVE_TABLES = [
  {
    table: "shopify_connections",
    requireRls: true,
    secretColumns: ["access_token"],
  },
  {
    table: "subscriptions",
    requireRls: true,
    secretColumns: ["stripe_customer_id", "stripe_subscription_id"],
  },
  {
    table: "webhook_endpoints",
    requireRls: true,
    secretColumns: ["secret"],
  },
  {
    table: "websites",
    requireRls: true,
    secretColumns: ["credentials", "google_service_account"],
  },
];

/** Roles that must be denied SELECT on every secret column. */
export const UNTRUSTED_ROLES = ["anon", "authenticated"];

/** Role that is allowed to read secret columns (trusted server-side). */
export const TRUSTED_ROLE = "service_role";
