# ENV MIGRATION GUIDE

Every environment variable the app reads, where it is read, and what it becomes
on your own Supabase project.

---

## 1. Frontend (Vite, build-time, public)

Read in `src/lib/config.ts` and `src/integrations/supabase/client.ts`; stored in
project-root `.env`.

| Variable | Current | New value |
|----------|---------|-----------|
| `VITE_SUPABASE_URL` | `https://qmuxdkxdrxevlnckssuw.supabase.co` | `https://<NEW_REF>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Lovable Cloud anon key | new project anon/publishable key |
| `VITE_SUPABASE_PROJECT_ID` | `qmuxdkxdrxevlnckssuw` | `<NEW_REF>` |
| `VITE_DEFAULT_CONTAINER_WIDTH` | `1140` | unchanged |
| `VITE_APP_URL` *(optional)* | falls back to `window.location.origin` | set to your domain if SSR/emails need it |
| `VITE_AI_PROVIDER` *(optional)* | `lovable` | `openai` / `gemini` / … once off Lovable AI |

`MODE`, `DEV`, `PROD` are Vite built-ins — nothing to migrate.

These three Supabase values are **public by design** (RLS protects the data).
Change them **last**, only after everything else is migrated and tested.

---

## 2. Edge Function secrets

Read via `supabase/functions/_shared/config.ts` (`edgeConfig`) and direct
`Deno.env.get`.

### Auto-provided by Supabase — do not set manually

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
(also present today: `SUPABASE_DB_URL`, `SUPABASE_JWKS`,
`SUPABASE_PUBLISHABLE_KEYS`, `SUPABASE_SECRET_KEYS`).

### You must set these

| Secret | Used by | Notes |
|--------|---------|-------|
| `AI_PROVIDER` | all AI functions | `lovable` \| `openai` \| `gemini` \| `groq` \| `deepseek` |
| `LOVABLE_API_KEY` | AI gateway path | **Lovable Cloud only** — needs replacing, see `LOVEABLE_CLOUD_DEPENDENCIES.md` |
| `GEMINI_API_KEY` | AI generation / SEO rewrite | your own Google AI key |
| `OPENAI_API_KEY` / `GROQ_API_KEY` / `DEEPSEEK_API_KEY` | optional providers | only if selected |
| `STRIPE_SECRET_KEY` | checkout, portal, plans, invoices | reuse existing |
| `STRIPE_WEBHOOK_SECRET` | `stripe-webhook` | **new value** — created when you add the new webhook endpoint |
| `SHOPIFY_CLIENT_ID` | Shopify OAuth | reuse; update redirect URL in the Shopify app |
| `SHOPIFY_CLIENT_SECRET` | Shopify OAuth | reuse |
| `APP_ORIGIN` | email links, OAuth returns | `https://3xvisibility.com` |
| `LOVABLE_SEND_URL` | email dispatch | **Lovable Cloud only** — replace with your own sender (Resend/SES) |
| `RENDER_SERVICE_URL` / `RENDER_SERVICE_KEY` | render + fidelity checks | only if you use the external renderer |
| `SCREENSHOTONE_ACCESS_KEY` | visual validation screenshots | optional |

Set with:

```bash
supabase secrets set AI_PROVIDER=gemini GEMINI_API_KEY=... --project-ref <NEW_REF>
```

### Runtime overrides table

`_shared/config.ts` also reads per-workspace overrides from an optional
`app_config` table (`config_key` / `config_value` / `workspace_id`). DB values
win over env vars. If the table exists in the backup it carries over
automatically; if not, the loader fails silently and env vars are used.

---

## 3. Config files that contain identifiers

| File | Field | Action |
|------|-------|--------|
| `supabase/config.toml` | `project_id` (`djknwurjbaltbbchfoss`) | set to `<NEW_REF>` |
| `_shared/email-templates/_layout.tsx` | asset URL with project ref | update |
| `_shared/transactional-email-templates/_layout.tsx` | asset URL with project ref | update |

---

## 4. Cut-over order (frontend last)

```
1. restore DB + apply SUPABASE_SETUP.sql
2. create buckets + copy files
3. set all edge secrets on the new project
4. deploy edge functions
5. configure Auth (URLs, providers, email hook)
6. re-point Stripe / Shopify / email webhooks
7. run the verification checklists in every guide
8. finally: update .env to the new URL / key / project id, rebuild, redeploy
9. keep the old project read-only for at least 2 weeks as rollback
```

Rollback is simply restoring the previous three `.env` values and rebuilding —
nothing in the old project is deleted or modified at any point.

---

## 5. Verification

- [ ] `select 1` via PostgREST with the new anon key succeeds
- [ ] Browser network tab shows requests going to `<NEW_REF>.supabase.co`
- [ ] No console error from `src/lib/config.ts` about missing env vars
- [ ] `supabase secrets list --project-ref <NEW_REF>` shows every secret above
- [ ] An AI action succeeds with your own provider key (not `LOVABLE_API_KEY`)
