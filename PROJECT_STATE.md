# MatMind — Project State & Handoff

> Living record of **live-system state, roadmap, and hard-won gotchas** — the
> context that does NOT live in the source code. Read this + `CLAUDE.md` + recent
> `git log` to start a new session fully oriented.
>
> Last updated: 2026-06-02

---

## 1. Live deployment state

| Thing | State |
|---|---|
| **Hosting** | Vercel, auto-deploys from GitHub `main` (`jkusky218/MatMind`) |
| **Apex domain** | `mat-mind.com` (note the hyphen) |
| **Team subdomains** | `test.mat-mind.com`, `lovetths.mat-mind.com`, `lovettyouth.mat-mind.com` |
| **DNS** | Squarespace: A record + wildcard `*` CNAME → `cname.vercel-dns.com`. Each subdomain also added individually in Vercel (wildcard verification needs Vercel nameservers, which we did not switch to). |
| **DB migrations applied** | **001 → 019** (019 adds the AI-channel-mode setting — run it in the SQL editor if not yet applied). |
| **Local dev** | `npm run dev` runs in **demo mode** (no Supabase env vars) — uses mock data in `src/lib/mockData.js`. Admin/super-admin UI is NOT visible in demo. |

### Team slugs (lowercase — browsers lowercase hostnames)
- `test` — the original dev/test team (was `lovett`, renamed to `test`)
- `lovetths` — Lovett HS Wrestling (was stored as `lovettHS`, fixed to lowercase)
- `lovettyouth` — Lovett Youth Wrestling

---

## 2. Environment variables (set in Vercel, NOT in the repo)

`.env.example` is **incomplete** — it lists Supabase + Anthropic + Twilio + SendGrid
but is missing the service-role and VAPID keys the code actually uses. Full list:

| Var | Used by | Notes |
|---|---|---|
| `VITE_SUPABASE_URL` | client + all `/api` | |
| `VITE_SUPABASE_ANON_KEY` | client | |
| `SUPABASE_SERVICE_ROLE_KEY` | `api/admin.js`, `api/notify.js`, `api/team.js` | **server-only**, never expose |
| `VITE_ROOT_DOMAIN` | `useTeamResolver` | **must be `mat-mind.com`** in prod; blank = no subdomain detection (demo/localhost) |
| `ANTHROPIC_API_KEY` | `api/chat.js` | Claude Haiku 4.5 |
| `VITE_VAPID_PUBLIC_KEY` | client push subscribe + `api/notify.js` | |
| `VAPID_PRIVATE_KEY` | `api/notify.js` | server-only |
| `VAPID_SUBJECT` | `api/notify.js` | e.g. `https://mat-mind.com` |
| `SENDGRID_API_KEY` | (future) email broadcasts | not built yet |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | (future) SMS | not built yet |

> TODO: add `SUPABASE_SERVICE_ROLE_KEY` and the three VAPID vars to `.env.example`.

---

## 3. Supabase dashboard config (not captured in migrations)

These were set in the Supabase dashboard and won't appear by reading the repo:

- **Auth → URL Configuration**
  - Site URL: `https://mat-mind.com`
  - Redirect URLs: `https://mat-mind-bay.vercel.app/**` and `https://*.mat-mind.com/**`
  - ⚠️ The `/**` pattern needs a path, so all auth `redirectTo` values append a
    trailing `/` (origin + '/') to match. See gotcha #3.
- **Database → Replication** — `public.messages` is in the `supabase_realtime`
  publication (done via **migration 018**, not the dashboard). Required for
  cross-device message sync.
- **Storage** — bucket `channel-files` (public, 10 MB, images + PDF) created in
  **migration 011**. Used for channel attachments AND team logos (logos stored
  under `logos/`). RLS: public read, authenticated insert, owner delete.

---

## 4. Multi-tenant & super-admin model

- Single Postgres DB; every table has `team_id`; RLS isolates teams via
  `get_auth_team_id()` (reads `profiles.team_id` for `auth.uid()`).
- **Subdomain → team**: `useTeamResolver` reads the subdomain pre-auth and calls
  the public `GET /api/team?slug=X` for branding. `App.jsx` overrides
  `profile.team_id` with the resolved team for data hooks.
- **Super admins** (`super_admins` table, migration 014): on visiting a subdomain
  whose team differs from their profile's `team_id`, `useAuth.switchTeam()`
  **updates `profiles.team_id` in the DB** so RLS scopes correctly. No RLS policy
  changes needed. `isSuperAdmin` grants coach+admin everywhere.
  - ⚠️ **Design limit**: a super-admin's "current team" is one shared DB column,
    so the *same* super-admin account can't actively view two *different*
    subdomains at once without them fighting. Fine for one-at-a-time use.

### Key accounts
- `joey.kusky@gmail.com` — super admin (seeded in migration 014)
- `debbietoddk@bellsouth.net` — Debbie Kennedy, admin on `lovetths` (promoted by
  direct SQL: `UPDATE profiles SET role='admin' WHERE email=...`)

---

## 5. Roadmap

### ✅ Done (this build cycle)
- Multi-tenant subdomain routing + pre-auth team branding
- Super-admin cross-team access
- Parent accounts (auto-invited with athletes) + multi-select roster filter pills
- Multi-group events (`roster_groups[]`)
- Settings build-out: team name, brand colors, roster groups (persisted),
  member management + role changes, **team logo upload**
- Channel image/file attachments (`channel-files` bucket)
- Message **edit & delete** (tap a message; coaches can moderate any)
- **AI in group channels** — `@MatMind` mention or question detection → AI answers
  from KB/schedule/roster (Q&A mode, no tools). **Conservative trigger** (real
  questions only; never hijacks messages addressed to a person; ignores meta-chatter)
  + **admin "AI Assistant" mode** in Settings: Off / Mentions / Smart (migration 019,
  `team_settings.ai_channel_mode`, default `smart`). Private coach AI channel is
  always fully active regardless.
- **Unified push notifications** — channel messages auto-notify subscribers;
  per-channel prefs (dynamic from groups); removed the manual bell; self-test
  button in Settings
- **Pull-to-refresh** — spinner, in-place data refresh (no full reload),
  touch + mouse, callback-ref so it attaches after the loading screen
- **Password reset** — login "Forgot password?" + admin per-member reset;
  invite emails redirect to the inviting team's subdomain
- **KB "Import from URL"** (`api/fetch-url.js`) + "Refresh from source"
- Default "How to Install MatMind" KB article for all teams (migration 012)
- Standard channels auto-seeded for all teams (migration 016)
- Marketing one-pager: `MatMind-OnePager.pdf` (regenerate via puppeteer-core)

### ⬜ Remaining
- **Email broadcasts (SendGrid)** — coach → roster newsletters (Phase 3). `.env`
  has `SENDGRID_API_KEY`; no endpoint/UI yet.
- **SMS (Twilio)** — tournament-day urgent alerts. `.env` has Twilio vars; nothing built.
- **KB file upload** — the "Upload File" step is still "coming soon" (would need
  PDF/image text extraction; bucket already exists).
- **"Ask AI to generate from this"** button in KB EntryDetail — still "coming soon".

---

## 6. Known gotchas (learned the hard way)

1. **Migrations must lead deploys.** The messages SELECT references columns added
   by migrations (`attachments`→011, `edited_at`→015). If app code ships ahead of
   the migration, the query errors and channels render blank. Running 015 was the
   actual fix for "channel history keeps disappearing."
2. **Never blank state on a transient fetch error.** `loadData` in `useTeamData`
   only *replaces* roster/events/channels/messages on a confirmed-good fetch; on
   error it keeps existing state. Prevents history vanishing on network blips /
   team switches / post-deploy socket reconnects.
3. **Supabase redirect allow-list needs a path.** All auth `redirectTo` =
   `window.location.origin + '/'` to match `https://*.mat-mind.com/**`.
4. **Notifications**: the sender is **excluded** (you don't get pinged for your own
   message). iOS suppresses banners when the app is **foreground**. iOS PWA push
   needs iOS 16.4+ and **home-screen install**. Use the Settings "Send a test
   notification" button (targets only you) to verify a device.
5. **Auth event churn**: `supabase.auth.onAuthStateChange` fires on every tab
   refocus / token refresh / realtime reconnect. `useAuth` ignores repeat events
   for the same user id, or it re-fetches the profile and (for super admins)
   re-triggers team switching → unmounts the app → wipes in-memory state.
6. **Slugs are lowercase** — browsers lowercase hostnames; store team slugs lowercase.
7. **Realtime** needs `messages` in the `supabase_realtime` publication +
   `REPLICA IDENTITY FULL` (migrations 015/018).
8. **Channel AI must stay out of conversation.** `shouldTriggerAI`
   (`ChannelThread.jsx`) originally matched question words (`is`/`are`/`can`) as
   substrings, so it replied to almost everything and users complained. It now
   needs a real `?`, won't answer messages addressed to a person (roster name +
   comma), ignores meta-chatter, and obeys the per-team `ai_channel_mode`
   (off/mentions/smart). If you touch it, keep it conservative.

---

## 7. Dev & verification workflow

- **Run locally**: `npm run dev` → demo mode (no Supabase). Demo login as
  coach/parent. Admin features need real Supabase + an admin/super-admin account.
- **Verify in a real browser** before shipping: the in-session preview tool, or
  `puppeteer-core` driving the system Chrome (`/Applications/Google Chrome.app/...`)
  for screenshots. `puppeteer-core` was installed `--no-save` (not in package.json).
- **Ship**: commit + push after each feature → Vercel auto-deploys. Write *why* in
  the commit message (these double as the decision log).
- **Migrations**: run by hand in the Supabase SQL editor, in numeric order.
- Build check: `npm run build` (Vite validates `src/` but **NOT** `api/` — use
  `node --check api/<file>.js` for serverless functions).

---

## 8. Key files (quick map)

| Area | File |
|---|---|
| Auth + super-admin + team switch + password reset | `src/hooks/useAuth.js` |
| Team data load / realtime / send / edit / delete / refresh | `src/hooks/useTeamData.js` |
| Team branding + logo settings | `src/hooks/useTeamSettings.js` |
| Subdomain → team resolution (pre-auth) | `src/hooks/useTeamResolver.js` |
| Push notifications + per-channel prefs | `src/hooks/usePushNotifications.js` |
| Pull-to-refresh | `src/hooks/usePullToRefresh.js` |
| Knowledge base + URL import | `src/hooks/useKnowledgeBase.js` |
| AI channel + group-channel AI + intents | `src/components/ChannelThread.jsx` |
| Message bubble (edit/delete UI, attachments) | `src/components/ChatBubble.jsx` |
| Settings (branding, groups, members, logo, notif test) | `src/components/SettingsPage.jsx` |
| Admin panel (add coach/athlete invites) | `src/components/AdminPanel.jsx` |
| Roster (filters, tap-to-call/email) | `src/components/RosterTab.jsx` |
| Serverless: AI / admin / push / team branding / URL fetch | `api/chat.js`, `api/admin.js`, `api/notify.js`, `api/team.js`, `api/fetch-url.js` |
| Storage helpers (attachments, logo) | `src/lib/storage.js` |
