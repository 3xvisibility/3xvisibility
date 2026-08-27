# EDGE FUNCTION MIGRATION GUIDE

78 Edge Functions plus a shared `_shared/` folder live in `supabase/functions/`.
They are code, not database objects — nothing about them comes from the
`.backup` file. They deploy unchanged to your own project once secrets and
`config.toml` point at it.

---

## 1. Full function inventory

**AI / content generation (19)**
`ai-campaign-assistant`, `ai-credits`, `ai-fill-variables`, `ai-generate`,
`ai-generate-rows`, `ai-provider-settings`, `ai-seo-assistant`,
`ai-site-builder`, `analyze-source-keywords`, `generate-pages`,
`generate-seo-content`, `generate-template`, `optimize-seo-content`,
`rewrite-content`, `translate-content`, `translate-template`, `translate-ui`,
`retranslate-site-pages`, `detect-site-language`

**Templates / rendering (16)**
`backfill-elementor-catalog`, `compare-pages`, `discover-templates`,
`extract-site-colors`, `fetch-site-content`, `html-fidelity-check`,
`rebox-all-templates`, `recheck-editor-readiness`, `reconvert-sections`,
`reconvert-template-json`, `regenerate-template-design`,
`resync-template-globals`, `sanitize-elementor-catalog`, `scan-template`,
`seed-elementor-templates`, `sync-template-engine`

**Publishing / sites (11)**
`publish-pages`, `republish-full-width`, `rollback-page`, `save-website`,
`page-asset`, `purge-wordpress-cache`, `wp-site-actions`, `test-connection`,
`visual-validate`, `update-template-kit`, `validate-template-kit`

**SEO / indexing (5)**
`generate-sitemap`, `google-indexing`, `indexnow-ping`, `robots-validate`,
`build-internal-links`

**Billing (7)**
`create-checkout`, `change-plan`, `check-subscription`, `customer-portal`,
`payment-methods`, `stripe-webhook`, `admin-invoice-status`

**Shopify (5)**
`shopify-oauth-init`, `shopify-oauth-callback`, `shopify-products`,
`shopify-webhooks`, `shopify-disconnect`

**Email (6)**
`auth-email-hook`, `send-transactional-email`, `preview-transactional-email`,
`process-email-queue`, `handle-email-unsubscribe`, `handle-email-suppression`

**Admin / infra (9)**
`admin-panel`, `admin-ai-providers`, `admin-payments`, `admin-websites`,
`manage-config`, `workspace-settings`, `scheduled-runner`, `seed-locations`,
`fire-webhooks`

**Public / marketing (2)**
`analyze-website-free`, `affiliate-track`

Shared code: `supabase/functions/_shared/` (config, CORS, AI client, email
templates, Elementor helpers). It deploys with every function automatically.

---

## 2. Before deploying

1. **`supabase/config.toml`** — `project_id` currently reads
   `djknwurjbaltbbchfoss`. Set it to your new project ref.
   Keep the whole `[functions.*] verify_jwt` block byte-identical; several
   public endpoints (`stripe-webhook`, `shopify-oauth-callback`,
   `handle-email-unsubscribe`, `analyze-website-free`, …) rely on
   `verify_jwt = false` and validate tokens or signatures in code instead.
2. **Hardcoded project refs** in
   `_shared/email-templates/_layout.tsx` and
   `_shared/transactional-email-templates/_layout.tsx` — replace with the new
   ref (asset URLs in email headers).
3. All other URLs come from `Deno.env.get("SUPABASE_URL")` via
   `_shared/config.ts` — nothing else to change.

## 3. Deploy

```bash
supabase login
supabase link --project-ref <NEW_REF>
supabase functions deploy            # deploys every function in the folder
```

Deploy **after** the database restore, so functions never hit a missing table.

---

## 4. Function → dependency matrix (what must exist first)

| Dependency | Functions that break without it |
|------------|--------------------------------|
| `deduct_ai_credits` RPC + `ai_credits`, `ai_credits_usage` | every AI function |
| `ai_provider_keys`, `user_ai_access`, `system_settings` | `ai-provider-settings`, `admin-ai-providers`, all AI routing |
| pgmq queues + `enqueue_email`/`read_email_batch`/`delete_email`/`move_to_dlq` | `auth-email-hook`, `send-transactional-email`, `process-email-queue` |
| `next_invoice_number` + `invoices` | `stripe-webhook`, `admin-invoice-status` |
| `user_page_counts` view | usage limits in `generate-pages`, `publish-pages` |
| `shopify_oauth_states`, `shopify_connections`, `get_shopify_access_token` | all Shopify functions |
| Storage buckets `ai-images`, `page-assets`, `render-checks` | image gen, `page-asset`, fidelity checks |
| `pg_cron` / scheduler | `scheduled-runner`, `process-email-queue` |

## 5. External webhooks to re-point after cut-over

| Provider | New endpoint |
|----------|--------------|
| Stripe | `https://<NEW_REF>.supabase.co/functions/v1/stripe-webhook` (create a new signing secret → `STRIPE_WEBHOOK_SECRET`) |
| Shopify app | redirect URL → `…/functions/v1/shopify-oauth-callback`; webhooks → `…/functions/v1/shopify-webhooks` |
| Supabase Auth send-email hook | `…/functions/v1/auth-email-hook` |
| Email provider bounce/complaint | `…/functions/v1/handle-email-suppression` |
| Unsubscribe links in emails | `…/functions/v1/handle-email-unsubscribe` |
| Scheduled jobs (`pg_cron`) | update any `net.http_post` URLs to the new ref |

## 6. Verification

- [ ] `supabase functions list` shows 78 functions
- [ ] `check-subscription` returns 200 for a logged-in user
- [ ] `ai-generate` deducts a credit and writes `ai_credits_usage`
- [ ] Stripe test event reaches `stripe-webhook` and creates an invoice
- [ ] Shopify OAuth round-trip stores a connection
- [ ] `process-email-queue` drains a queued test email
- [ ] `analyze-website-free` works unauthenticated (public homepage analyzer)
