# Column-Level Security: Hidden Columns & Enforcement

This document describes exactly which database columns are hidden from client
apps, and the mechanism that enforces it. It is the canonical reference for
anyone adding a migration, an edge function, or an API query that touches the
tables below.

> **TL;DR** — Secret columns are protected by **PostgreSQL column-level GRANTs**,
> not by RLS alone. RLS controls *which rows* a user sees; column GRANTs control
> *which columns*. Both are required. Never re-grant table-level `SELECT`.

---

## 1. Hidden (secret) columns

These columns must **never** be readable by the `anon` or `authenticated`
Postgres roles. They are readable only by `service_role` (trusted edge functions
and admin/backend code).

| Table                  | Hidden column(s)                              | Why it's sensitive                          |
| ---------------------- | --------------------------------------------- | ------------------------------------------- |
| `shopify_connections`  | `access_token`                                | Shopify Admin API token (full store access) |
| `subscriptions`        | `stripe_customer_id`, `stripe_subscription_id`| Stripe billing identifiers                  |
| `webhook_endpoints`    | `secret`                                       | HMAC signing secret for outbound webhooks   |
| `websites`             | `credentials`, `google_service_account`        | CMS auth (WP/Shopify/etc.) + GSC service key|

All other columns on these tables remain readable by `authenticated` so the app
UI keeps working.

---

## 2. How enforcement works

For each table above, the migration does the following (in order):

1. **Revoke** table-level `SELECT` from `anon` / `authenticated`.
   ```sql
   REVOKE SELECT ON public.<table> FROM authenticated;
   REVOKE SELECT ON public.<table> FROM anon;
   ```
2. **Grant** column-level `SELECT` on the **non-secret** columns only.
   ```sql
   GRANT SELECT (id, user_id, /* ...every non-secret column... */) 
     ON public.<table> TO authenticated;
   ```
3. **Keep** full access for the trusted backend.
   ```sql
   GRANT ALL ON public.<table> TO service_role;
   ```
4. **RLS** stays enabled and unchanged (row-level scoping by `workspace_id` /
   `auth.uid()`).

Because the secret columns are simply omitted from the `GRANT SELECT (...)`
list, PostgREST (the Data API) returns a permission error if a client tries to
select them — while the granted columns work normally.

### Why not RLS alone?

RLS can hide *rows*, but a policy that lets a user read their own row would still
expose *every column* of that row, including the secret ones. Column GRANTs are
the only mechanism that hides individual columns.

---

## 3. Rules for future changes

- **Adding a new column** to one of these tables: it is **not** automatically
  readable (table-level SELECT is revoked). If it's non-secret and the UI needs
  it, add it to the column-level `GRANT SELECT (...)` list in the same migration.
  If it's secret, add nothing (service_role already has `ALL`) and register it in
  the regression config (see §4).
- **Never** run `GRANT SELECT ON public.<table> TO authenticated;` (table-level)
  on these tables — it re-exposes the secret columns.
- **API queries / edge functions:** never `select("*")` on these tables in a
  response. Enumerate non-secret columns explicitly. Edge functions may *read*
  secret columns via `service_role` for internal work, but must not return them
  to the client.
- **Security-definer functions** that return a secret (e.g.
  `get_shopify_access_token`) must have EXECUTE granted only to
  `service_role` / `postgres`, never to `anon` / `authenticated`.

---

## 4. Automated regression checks

Coverage lives in `scripts/security/`:

- **`sensitive-fields.mjs`** — single source of truth listing every table, its
  secret columns, and the RLS requirement. **Add new secret columns here.**
- **`check-sensitive-grants.mjs`** — psql-backed runner. For each secret column
  it asserts: RLS enabled, **not** SELECT-able by `anon`/`authenticated`, still
  SELECT-able by `service_role`. Exits non-zero on any violation.
- **`src/test/sensitive-grants-regression.test.ts`** — the same assertions inside
  vitest; runs live when a DB connection exists, auto-skips otherwise.
- **CI:** `.github/workflows/security-regression.yml` runs the check on any
  migration or security-script change.

Run after every migration:

```bash
npm run test:security
```

---

## 5. Related references

- Security posture summary: `@security-memory` (managed via the security tools).
- Original hardening migration:
  `supabase/migrations/20260710200515_77878fb0-1ee1-4931-a081-c6a884461a5d.sql`.
