# MatMind — Onboarding a New Tenant (Team)

Step-by-step runbook for adding a new team to MatMind. Each team is a "tenant":
isolated by `team_id` + RLS, reached at its own subdomain `<slug>.mat-mind.com`.

**Time:** ~10–15 minutes. **You need:** Supabase SQL editor access, Vercel project
access, and a super-admin account (currently `joey.kusky@gmail.com`).

---

## What gets created automatically vs. manually

| Created automatically (DB triggers, on team INSERT) | Created manually |
|---|---|
| Standard channels: Announcements, Advanced, Beginner, Tots (migration 016) | The `teams` row |
| "How to Install MatMind" KB article (migration 012) | The `team_settings` row |
| `team_settings` group + notification defaults (column defaults) | The subdomain in Vercel |
| | The first admin / coaches / athletes |

Auth redirect URLs need **no change** — `https://*.mat-mind.com/**` already covers
every new subdomain.

---

## Conventions

Pick a **slug**: lowercase, letters/numbers only, no dots (browsers lowercase
hostnames). It becomes the subdomain. Examples used below — replace throughout:

- `<SLUG>` = `northside`
- `<TEAM NAME>` = `Northside Wrestling`

---

## Step 1 — Create the team (Supabase SQL editor)

Run both statements together. The `teams` INSERT fires the triggers that seed
channels + the install KB article. `team_settings` carries branding; its `groups`
and `notification_settings` use built-in defaults (the standard 4 groups), so you
only set name + colors here.

```sql
-- 1a. Create the team
INSERT INTO public.teams (name, slug, school, mascot, primary_color, secondary_color, accent_color)
VALUES (
  'Northside Wrestling',  -- <TEAM NAME>
  'northside',            -- <SLUG>  (lowercase!)
  'Northside',            -- school (optional)
  'Eagles',               -- mascot (optional)
  '#1B3A5C',              -- primary
  '#6BADE4',              -- secondary
  '#C4A44A'               -- accent
);

-- 1b. Create its settings row (branding the app reads). groups + notification
--     prefs default automatically — only override if this team differs.
INSERT INTO public.team_settings (team_id, team_name, primary_color, secondary_color)
SELECT id, 'Northside Wrestling', '#1B3A5C', '#6BADE4'
FROM   public.teams
WHERE  slug = 'northside'
ON CONFLICT (team_id) DO NOTHING;
```

**Verify the auto-seed worked:**

```sql
SELECT t.slug, t.name,
       (SELECT count(*) FROM channels       c  WHERE c.team_id = t.id) AS channels,   -- expect 4
       (SELECT count(*) FROM knowledge_base  kb WHERE kb.team_id = t.id) AS kb_articles, -- expect 1
       (SELECT count(*) FROM team_settings   s  WHERE s.team_id = t.id) AS settings_rows  -- expect 1
FROM public.teams t
WHERE t.slug = 'northside';
```

---

## Step 2 — Add the subdomain in Vercel

The wildcard `*` CNAME in Squarespace routes any subdomain to Vercel, but Vercel
still needs each subdomain registered on the project (we use individual domains, not
Vercel nameservers).

1. Vercel → the MatMind project → **Settings → Domains**
2. **Add** `northside.mat-mind.com`
3. Vercel shows it as valid once DNS resolves (the wildcard CNAME already exists, so
   this is usually instant; allow a few minutes if it shows "pending").

> No DNS change needed in Squarespace — the wildcard `*` CNAME already covers it.

---

## Step 3 — Verify routing

Open `https://northside.mat-mind.com` in an **incognito window**. You should see the
login screen branded with the team name (it loads from the public
`/api/team?slug=northside` endpoint before sign-in).

- ❌ "Team not found" → the slug in the URL doesn't match the DB `slug`. Check for
  case/typo (`SELECT slug FROM teams`).
- ❌ Wrong team's branding → `VITE_ROOT_DOMAIN` not set, or DNS not resolved yet.

---

## Step 4 — Bootstrap the first admin

A new team has no users yet. Two ways to seed the first admin:

### Option A — Super-admin path (recommended)
1. As the super admin, open `https://northside.mat-mind.com` and sign in. Visiting
   the subdomain auto-switches you to this team (you're admin everywhere).
2. Tap **+** (top bar) → **Add Coach** → enter the head coach's name + email →
   they get an invite email that returns to `northside.mat-mind.com`.
3. Settings → **Member Management** → tap the coach's **Admin** pill to promote them.

### Option B — SQL (if the person already has a MatMind auth account)
```sql
UPDATE public.profiles
SET role = 'admin',
    team_id = (SELECT id FROM public.teams WHERE slug = 'northside')
WHERE email = 'headcoach@example.com';
```
> If they have **no** account yet, use Option A — the invite creates the auth user +
> profile. Don't hand-create auth users.

---

## Step 5 — Brand the team (Settings → Team Branding, admin only)

- **Team Name** — display name in header + login
- **Primary / Secondary colors** — 12 presets or custom hex
- **Team Logo** — upload PNG/JPG/SVG (≤ 2 MB). Appears in the header and on the
  login screen. (Logo must be uploaded via UI — it goes to Supabase Storage.)

---

## Step 6 — Roster groups (only if different from default)

Default groups are **Coaches, Tots, Beginner, Advanced**. If this team uses
different skill tiers, edit them in **Settings → Roster Groups** (the Coaches group
can't be removed). Groups drive channels, event targeting, and notification prefs.

---

## Step 7 — Add coaches, athletes & parents

Use the **+** panel (coaches/admins only):

- **Add Coach** — name, email, title, optional group → invite email sent.
- **Add Athlete** — name, weight, grade, school, group, and up to 2 parent
  contacts. **Each parent with an email is auto-invited** and gets their own
  parent account (limited view: no AI command center, RSVP buttons on the
  schedule). Parents post under their own name.

Invites land on `northside.mat-mind.com`'s set-password screen.

---

## Step 8 — Seed team knowledge base

The install-app guide is already there. Add team-specific content in the **KB** tab
→ **+ Add**:
- **Type Content** — paste tournament info, policies, FAQs
- **Import from URL** — pull text from the team's website / a flyer page (then
  trim & save). Use **Refresh from source** later to re-pull.

The AI Coach answers parent questions in channels from this content automatically.

---

## Final verification checklist

- [ ] `northside.mat-mind.com` loads branded login (incognito)
- [ ] Step-1 verify query shows 4 channels, 1 KB article, 1 settings row
- [ ] First admin can sign in and sees the admin Settings sections
- [ ] Messages tab shows the 4 channels; posting a message appears instantly and
      syncs to a second device
- [ ] A test athlete's parent received an invite that lands on the right subdomain
- [ ] (Optional) Logo + colors set; "Send a test notification" reaches a device

---

## Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| "Team not found" at the subdomain | Slug mismatch (case/typo), or `VITE_ROOT_DOMAIN` unset in Vercel. Slugs must be lowercase. |
| Subdomain won't resolve | Subdomain not added in Vercel → Domains, or DNS still propagating. |
| Channels tab empty | The 016 trigger didn't run for this team (created before the trigger existed). Re-run migration 016 — it back-fills missing channels. |
| Messages don't sync across devices | `messages` not in the realtime publication → run migration 018. |
| Invite/reset email lands on `mat-mind.com` apex | The redirect needs the subdomain; invites already send `origin + '/'`. Confirm `https://*.mat-mind.com/**` is in Supabase → Auth → Redirect URLs. |
| Admin sections missing for the new admin | Their `profiles.role` isn't `admin`, or their `profiles.team_id` doesn't match this team. |

---

## Quick reference — full onboarding SQL

```sql
-- Replace the two placeholders, run once.
INSERT INTO public.teams (name, slug, school, mascot, primary_color, secondary_color, accent_color)
VALUES ('Northside Wrestling', 'northside', 'Northside', 'Eagles', '#1B3A5C', '#6BADE4', '#C4A44A');

INSERT INTO public.team_settings (team_id, team_name, primary_color, secondary_color)
SELECT id, 'Northside Wrestling', '#1B3A5C', '#6BADE4'
FROM public.teams WHERE slug = 'northside'
ON CONFLICT (team_id) DO NOTHING;
```
Then: add `northside.mat-mind.com` in Vercel → bootstrap the first admin (Step 4).
