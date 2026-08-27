# AUTH MIGRATION GUIDE

The `auth` schema is **not** part of a `--schema=public` restore, and Supabase
manages it directly. Plan auth as a separate migration track.

---

## 1. What the app depends on

### Auth methods used in code

| API | Where |
|-----|-------|
| `supabase.auth.signUp` | `src/pages/AuthPage.tsx` |
| `supabase.auth.signInWithPassword` | `AuthPage.tsx`, `AdminLoginPage.tsx` |
| `supabase.auth.resetPasswordForEmail` | `AuthPage.tsx` |
| `supabase.auth.updateUser` | `SettingsPage.tsx`, `ResetPasswordPage.tsx` |
| `supabase.auth.onAuthStateChange` | `App.tsx`, `ResetPasswordPage.tsx`, `WorkspaceContext` |
| `supabase.auth.getSession` / `getUser` | ~40 call sites (workspace scoping, edge auth headers) |
| `supabase.auth.signOut` | `App.tsx`, `AdminLoginPage.tsx` |
| OAuth (Google/Apple) | `src/integrations/lovable/index.ts` → **Lovable Cloud auth broker** |

### Server-side auth in Edge Functions

Every protected function validates the bearer token with
`supabaseAdmin.auth.getUser(token)` (service-role client). This pattern works
unchanged on any Supabase project — only the URL/keys change.

### Database objects bound to auth

| Object | Note |
|--------|------|
| `on_auth_user_created` → `handle_new_user()` | seeds `profiles`, `subscriptions` (plan `agency`), `user_roles` (`user`) |
| `on_auth_user_created_workspace` → `handle_new_user_workspace()` | creates a `workspaces` row + `workspace_members` owner row |
| `current_verified_email()` | reads `auth.users.email_confirmed_at` |
| `has_role(auth.uid(), 'admin')` | admin gating in ~30 policies |
| `is_workspace_member(auth.uid(), …)` | tenant isolation in most policies and in storage policies |
| `auth-email-hook` edge function | Supabase **Send Email Hook** — enqueues auth emails into pgmq |

**Both `auth.users` triggers must be recreated manually** — see
`SUPABASE_SETUP.sql` §E. Without them, every new signup lands with no profile,
no workspace and no role, and the app appears empty after login.

---

## 2. Migrating users

Two supported approaches:

### A. Include the `auth` schema in the restore (preferred, keeps passwords)

If `xxxvisibilty_260827.backup` was taken with the full database (not
`--schema=public`), restore `auth.users` and `auth.identities` **only**:

```bash
pg_restore --no-owner --no-privileges --data-only \
  --table=users --table=identities --schema=auth \
  --dbname "postgresql://postgres:<PW>@db.<NEW_REF>.supabase.co:5432/postgres" \
  xxxvisibilty_260827.backup
```

Restore `auth` **before** `public`, so FK-style user references and the seeded
`profiles`/`workspaces` rows line up on the same UUIDs.
Disable the two `auth.users` triggers during this data load (or create them
after), otherwise every restored user re-seeds duplicate workspaces:

```sql
alter table auth.users disable trigger user;   -- run before the auth data-load
-- … restore …
alter table auth.users enable  trigger user;   -- run after
```

Password hashes (`encrypted_password`, bcrypt) carry over — users keep their
passwords. JWT secrets differ, so **all existing sessions are invalidated** and
everyone signs in again once.

### B. Admin API re-invite (if the backup has no auth schema)

For each row in the exported `profiles` table, call
`POST /auth/v1/admin/users` on the new project with `email`, the **same `id`**
(so `public` rows keep matching) and `email_confirm: true`, then trigger a
password reset email. Users must set a new password.

---

## 3. Auth settings to reconfigure by hand

Dashboard → Authentication:

- **Site URL**: `https://3xvisibility.com`
- **Redirect URLs**: `https://3xvisibility.com/**`, `https://www.3xvisibility.com/**`,
  `https://xxxvisibilty.lovable.app/**`, `http://localhost:8080/**`
- **Email provider / SMTP** and templates (confirm, reset, invite, magic link)
- **Send Email Hook** → point to the new project's `auth-email-hook` function URL
- **Email confirmations**: keep enabled; anonymous sign-ins stay **off**
- **JWT expiry / refresh rotation**: match current settings
- **Providers**: enable Google (and Apple if used) with your own OAuth client ID
  and secret — see §4

---

## 4. Replacing Lovable Cloud OAuth

`src/integrations/lovable/index.ts` uses `@lovable.dev/cloud-auth-js`, which
brokers Google/Apple through Lovable Cloud. On your own project this must become
native Supabase OAuth:

```ts
await supabase.auth.signInWithOAuth({
  provider: "google",
  options: { redirectTo: `${window.location.origin}/auth/callback` },
});
```

Do this **at cut-over only** — the file is auto-generated in the current setup
and must not be edited while still on Lovable Cloud.

Also relevant: `src/integrations/supabase/previewAuthStorage.ts` implements the
Lovable preview session broker. On your own hosting it can be replaced with the
default `localStorage` storage in `createClient`.

---

## 5. Verification

- [ ] New signup → rows appear in `profiles`, `subscriptions`, `user_roles`, `workspaces`, `workspace_members`
- [ ] Existing user can sign in (password preserved)
- [ ] Password reset email arrives and `/reset-password` completes
- [ ] Google OAuth completes and lands on the dashboard
- [ ] `has_role(auth.uid(),'admin')` returns true for your admin account
- [ ] An authenticated PostgREST read is workspace-scoped (no cross-tenant rows)
