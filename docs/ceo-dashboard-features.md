# MatMind — CEO Operations Dashboard Feature Spec

> Full reference spec for the `/admin` CEO Operations Dashboard.
> Source of truth for backlog features D01–D12.
> See `docs/backlog/feature-list.md` for prioritized story queue.
> See `docs/backlog/stories/sprint-dashboard-p0.md` for P0 build-ready stories.

---

## Overview

The CEO Operations Dashboard lives at `/admin`, protected by a `super_admin` role. It gives the MatMind operator a real-time view of every tenant, the AI system's health, support queue, development pipeline, marketing funnel performance, and financial metrics — all in one place.

This is an **internal operator tool**, not visible to coaches or parents. It is code-split from the main team app and loads only when the authenticated user carries the `super_admin` role in their Supabase JWT.

---

## Architecture

- **Route:** `/admin` (and sub-routes `/admin/health`, `/admin/tenants`, etc.)
- **Auth guard:** `super_admin` role checked from Supabase JWT custom claim. Redirect to `/` on failure.
- **Code split:** `src/admin/` directory, lazy-loaded via React `lazy()` + `Suspense`. Zero admin code ships in the main bundle.
- **Data:** Same Supabase project; admin queries use the service-role key via Vercel serverless functions in `api/admin/`. Never trust `super_admin` from the client request body — verify from JWT server-side.
- **RLS:** New `super_admin` policies on all tables: `USING (auth.jwt() ->> 'role' = 'super_admin')`. Admin can read all rows regardless of `team_id`.
- **Realtime:** Select sections use Supabase Realtime subscriptions for live updates (support tickets, system health).

---

## Sections

### 1. Overview (Dashboard Home)
**Route:** `/admin`

Summary cards — one per section — showing the most important metric from each:
- System: uptime percentage (last 24 h)
- Tenants: active team count, new this week
- Usage: DAU, AI calls today
- Support: open ticket count, oldest unresolved age
- Dev: last QA result (✅/❌), last deploy timestamp
- Marketing: leads this week, CPA (if available)
- Finance: MRR (if Stripe connected)

Each card links to its full section. Clicking a red/warning card deep-links to the specific problem.

---

### 2. System Health
**Route:** `/admin/health`

| Metric | Source | Refresh |
|--------|--------|---------|
| API uptime (%) | `/api/admin/health` endpoint logs | 60 s |
| Supabase status | Supabase status API | 5 min |
| Vercel deployment status | Vercel API | on load |
| Average API response time (p50, p95) | Logged in `system_health_log` table | 60 s |
| Error rate (5xx / total) | `api_error_log` table | 60 s |
| Active WebSocket connections (Realtime) | Supabase dashboard metric | 5 min |

**Health check endpoint:** `GET /api/admin/health` — pings Supabase, returns `{ status, latency_ms, timestamp }`. Called by an external uptime monitor (UptimeRobot or similar) as well as the dashboard.

**Uptime log:** `system_health_log (id, checked_at, status, latency_ms, error_message)` — inserted by a Vercel cron job every 5 minutes.

---

### 3. Tenant Operations
**Route:** `/admin/tenants`

**List view:**
- All teams: name, slug, subdomain, plan tier, created date, last active
- Counts: total tenants, active last 7 days, active last 30 days
- At-risk flag: teams with zero logins in 14+ days highlighted in amber

**Detail view (`/admin/tenants/:teamId`):**
- Team profile: name, branding, primary coach email
- Athlete count, parent count, coach count
- Event count (last 30 days), messages sent (last 30 days)
- AI command center usage: calls this week, avg tokens per call
- Availability RSVP rate: confirmed / total athletes across last 5 events
- Last login by any user

**Actions (with confirmation dialog):**
- Impersonate team (opens team app in new tab with service-role session — read only, never writes)
- Send system notification to team
- Deactivate team (sets `teams.active = false`)

---

### 4. Usage Analytics
**Route:** `/admin/analytics`

| Metric | Definition | Source |
|--------|-----------|--------|
| DAU | Distinct `user_id` with any Supabase auth activity | `auth.audit_log_entries` |
| MAU | Same, 30-day window | Same |
| DAU/MAU ratio | Stickiness proxy | Computed |
| Feature usage | Count of events per feature per day | `feature_events` table |
| AI calls / day | Count of `/api/chat` invocations | `ai_call_log` table |
| AI token cost | `(input_tokens * $1 + output_tokens * $5) / 1,000,000` — Haiku 4.5 pricing | `ai_call_log.token_counts` |
| Cache hit rate | `cache_read_input_tokens / input_tokens` | `ai_call_log` |
| Most-used tools | `schedule_events`, `post_to_channel`, `draft_newsletter` call counts | `ai_call_log.tool_calls` |

**Feature event tracking:** A lightweight `feature_events (id, team_id, user_id, feature, action, created_at)` table. Client fires `trackFeature('schedule', 'rsvp')` — a thin wrapper around a Supabase insert. Never blocks the UI.

Charts: 30-day sparklines for DAU, AI calls, and token cost. Bar chart for feature usage breakdown.

---

### 5. Support
**Route:** `/admin/support`

Mirrors the three-tier support model from the business plan.

**Queue view:**
- Open tickets sorted by age (oldest first)
- Columns: ticket ID, team, user, subject, tier (T1/T2/T3), created, last message
- Filter by tier, team, status (open / pending / resolved / escalated)

**Ticket detail:**
- Full message thread (user ↔ AI ↔ human agent)
- AI summary of the issue (one sentence, pre-generated on ticket creation)
- Actions: reply, close, escalate to T3, promote resolution to KB

**Metrics:**
- Open ticket count by tier
- AI resolution rate (T1 resolved / T1 opened, last 7 days)
- Median first-response time
- Top 10 questions the AI couldn't answer (KB miss log)

---

### 6. Development & Backlog
**Route:** `/admin/dev`

| Panel | Data source |
|-------|------------|
| Current sprint | Last 5 commits on `main` (`git log` via GitHub API) |
| Open GitHub Issues | GitHub API — filter label `bug` |
| Last QA result | `docs/qa/reports/` latest file content |
| Last deploy | Vercel API — latest production deployment |
| Deploy history | Vercel API — last 10 deployments, status + timestamp |
| Branch protection | GitHub API — confirm `main` requires PR |

**Quick links:** Open GitHub repo, open Vercel dashboard, trigger manual QA run (calls Cowork scheduled task via webhook).

---

### 7. Marketing & Acquisition
**Route:** `/admin/marketing`

Requires Facebook Marketing API integration (see `docs/facebook-funnel-automation.md`).

| Metric | Source |
|--------|--------|
| Leads this week / month | Facebook Lead Gen API or manual input |
| Cost per lead by funnel stage | Facebook Insights API |
| TOFU → MOFU conversion rate | Computed from audience sizes |
| Top performing ad (CTR) | Facebook Insights API |
| Landing page conversion rate | Facebook Pixel events |

**Before Facebook API integration:** Manual input form — operator enters weekly lead count and CPA by channel (Facebook, word of mouth, referral). Stored in `marketing_snapshots` table.

---

### 8. Finance
**Route:** `/admin/finance`

Requires Stripe integration. Deferred to P3.

| Metric | Source |
|--------|--------|
| MRR | Stripe subscriptions |
| New MRR this month | Stripe events |
| Churned MRR | Stripe cancellations |
| LTV (avg) | MRR / churn rate |
| CAC | Marketing spend / new customers |
| Payback period | CAC / MRR per customer |

---

### 9. Quick Actions
Available on the Overview page as a floating action panel.

| Action | Effect |
|--------|--------|
| Create new tenant | Opens a modal → inserts row in `teams`, sends welcome email |
| Respond to oldest open ticket | Deep-links to oldest T3 ticket in Support |
| Trigger QA run | Webhook to Cowork scheduled task |
| Force redeploy | Vercel deploy hook (POST to deploy URL) |
| Broadcast system message | Sends a message to all teams' Announcements channel |

All destructive actions require a confirmation dialog with the action spelled out in plain English.

---

## Database Additions

```sql
-- Super admin role (add to profiles.role enum)
ALTER TYPE user_role ADD VALUE 'super_admin';

-- System health log (written by cron, read by admin dashboard)
CREATE TABLE system_health_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checked_at  timestamptz NOT NULL DEFAULT now(),
  status      text NOT NULL CHECK (status IN ('ok','degraded','down')),
  latency_ms  integer,
  error_msg   text
);

-- AI call log (written by /api/chat on every call)
CREATE TABLE ai_call_log (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id           uuid REFERENCES teams(id),
  user_id           uuid REFERENCES auth.users(id),
  created_at        timestamptz DEFAULT now(),
  input_tokens      integer,
  output_tokens     integer,
  cache_read_tokens integer,
  tool_calls        jsonb,
  latency_ms        integer
);

-- Feature event tracking
CREATE TABLE feature_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    uuid REFERENCES teams(id),
  user_id    uuid REFERENCES auth.users(id),
  feature    text NOT NULL,
  action     text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Marketing snapshots (manual input before Facebook API)
CREATE TABLE marketing_snapshots (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of      date NOT NULL,
  channel      text NOT NULL,
  leads        integer DEFAULT 0,
  spend_cents  integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- RLS: all admin tables readable only by super_admin
-- (policies defined in migration)
```

---

## Environment Variables

```
# Already present
SUPABASE_SERVICE_ROLE_KEY=   # used by all /api/admin/* functions

# New for admin dashboard
VERCEL_TOKEN=                # read-only, for deployment history
GITHUB_TOKEN=                # read-only, for issue + commit data
GITHUB_REPO=jkusky218/MatMind
UPTIME_WEBHOOK_SECRET=       # validates health-check pings
```

---

## Security Notes

- `/admin` route is client-side guarded AND server-side guarded (every `api/admin/*` function verifies `super_admin` from JWT)
- `super_admin` role is set only via Supabase dashboard or a one-time seed script — never via a public API
- Admin impersonation is read-only: the service-role session used for impersonation never writes data
- All admin actions are logged in a `admin_audit_log` table with `actor_id`, `action`, `target`, `timestamp`
