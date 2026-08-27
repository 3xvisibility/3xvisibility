# LOVEABLE CLOUD DEPENDENCIES

Everything in the codebase that is tied to Lovable Cloud specifically (as
opposed to plain Supabase), with a replacement path for each. None of these need
to change while you are still running on Lovable Cloud — they are the cut-over
work list.

---

## 1. Auth broker (Google / Apple OAuth)

| Item | Detail |
|------|--------|
| Package | `@lovable.dev/cloud-auth-js` (`package.json`) |
| File | `src/integrations/lovable/index.ts` (auto-generated) |
| What it does | Brokers social sign-in through Lovable Cloud, then calls `supabase.auth.setSession()` |

**Replacement:** native `supabase.auth.signInWithOAuth({ provider: 'google' })`
with your own Google OAuth client configured in the new project. Then remove the
dependency. Details in `AUTH_MIGRATION_GUIDE.md` §4.

## 2. Preview session storage

| Item | Detail |
|------|--------|
| File | `src/integrations/supabase/previewAuthStorage.ts` (auto-generated) |
| Used by | `src/integrations/supabase/client.ts` → `storage: brokeredPreviewStorage()` |

**Replacement:** drop the custom storage adapter; the default `localStorage`
behaviour is correct outside the Lovable preview iframe.

## 3. Lovable AI Gateway

| Item | Detail |
|------|--------|
| Secret | `LOVABLE_API_KEY` |
| Base URL | `https://api.lovable.dev/v1` (`_shared/config.ts` → `AI_PROVIDERS.lovable`) |
| Consumers | every AI edge function (generation, SEO rewrite, translation, site builder, image gen) |

**Replacement:** the provider registry already supports `openai`, `gemini`,
`groq`, `deepseek`. Set `AI_PROVIDER` to one of those and supply the matching
key — no code change required. Verify image generation, which currently relies
on the gateway's image route; if you switch providers, point it at your own
image endpoint.

## 4. Email sending

| Item | Detail |
|------|--------|
| Secret | `LOVABLE_SEND_URL` |
| Consumers | `send-transactional-email`, `process-email-queue`, `auth-email-hook` chain |

**Replacement:** your own transactional provider (Resend, SES, Postmark). Only
the HTTP POST target inside the send path changes; the pgmq queue design,
templates, suppression list and unsubscribe flow are all plain Postgres/edge
code and migrate as-is.

## 5. Build-time tooling

| Item | Detail | Action |
|------|--------|--------|
| `lovable-tagger` | dev dependency used by `vite.config.ts` in dev mode | harmless; keep or remove — not used in production builds |

## 6. Hosting / preview surface

| Item | Detail |
|------|--------|
| Preview URL | `https://id-preview--…lovable.app` |
| Published URL | `https://xxxvisibilty.lovable.app` |
| Custom domains | `https://3xvisibility.com`, `https://www.3xvisibility.com` |
| Badge CSS | badge-hiding rules in `src/index.css` |

**Replacement:** if you also move hosting, build with `npm run build` and serve
`dist/` from Vercel/Netlify/your own host, then re-point DNS. The badge CSS can
stay — it is inert elsewhere.

## 7. Managed backend surfaces with no code footprint

These exist only as Lovable Cloud UI conveniences and have plain Supabase
equivalents in your own project's dashboard:

- Secret management → `supabase secrets set`
- Migration approval flow → `supabase db push` / SQL editor
- Data export page → `pg_dump` / `pg_restore`
- Function deploy → `supabase functions deploy`
- Service-role key access (unavailable on Lovable Cloud) → visible in your own
  project's API settings

## 8. Hardcoded project identifiers

| File | Value |
|------|-------|
| `.env` | `qmuxdkxdrxevlnckssuw` (URL, key, project id) |
| `supabase/config.toml` | `djknwurjbaltbbchfoss` |
| `_shared/email-templates/_layout.tsx` | project-ref asset URL |
| `_shared/transactional-email-templates/_layout.tsx` | project-ref asset URL |
| `src/pages/MigrateToSupabasePage.tsx` | shown as documentation text only |

---

## Cut-over checklist for this file

- [ ] Google/Apple OAuth switched to native Supabase providers
- [ ] `@lovable.dev/cloud-auth-js` removed and `src/integrations/lovable/` deleted
- [ ] `previewAuthStorage` replaced with default storage
- [ ] `AI_PROVIDER` set to a non-Lovable provider with your own key
- [ ] Transactional email sender replaced (`LOVABLE_SEND_URL` retired)
- [ ] All four hardcoded project refs updated
- [ ] Old Lovable Cloud project left intact, read-only, as rollback
