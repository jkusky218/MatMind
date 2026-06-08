# MatMind — Prioritized Feature Backlog

> Source of truth for what we build and in what order. Priorities run **P0
> (launch-critical)** → **P3 (post-launch / scale)**. Each feature is sized for a
> youth-wrestling team of 6 coaches, 60–80 athletes, and 100+ parents, and maps
> to the product vision in [`CLAUDE.md`](../../CLAUDE.md).
>
> **Status legend:** ✅ Done · 🚧 In progress · ⬜ Planned
>
> **Core principle:** _The AI isn't a feature inside the app — it **is** the app._
> Conversational-first input, visual dashboards for context.

---

## P0 — MVP / Launch-Critical

These define a usable product. Without all four, MatMind cannot replace TeamSnap.

### F01 · Multi-tenant Auth & Subdomain Routing  ✅
**As a** coach **I want** my team reachable at its own subdomain with isolated data
**so that** each team's roster, schedule, and messages stay private.
- Supabase Auth (email/password + magic link); `team_id` on every table; RLS isolation.
- `<slug>.mat-mind.com` → team resolved pre-auth via public `/api/team?slug=`.
- **Acceptance:** two teams cannot read each other's rows; login branded per subdomain.
- **Deps:** Supabase schema (`001_initial_schema.sql`), Vercel domains.

### F02 · Conversational AI Command Center  ✅
**As a** coach **I want** to run the team by typing plain English **so that** I avoid
menus and forms.
- Private "MatMind AI" channel. Claude Haiku 4.5 via Vercel serverless (`/api/chat`).
- Tool use: create events, update availability, post to channels — confirm before acting.
- Prompt caching of roster/schedule context to cut input cost ~90%.
- **Acceptance:** "Add practice Thursday at 6pm" creates the event; "Who's confirmed for Peach State?" answers from live data.
- **Deps:** F01, F03, F04, `ANTHROPIC_API_KEY`.

### F03 · Schedule & Availability  ✅
**As a** parent **I want** to see practices/matches/tournaments and RSVP **so that** the
coach can plan lineups.
- Event types, multi-group targeting (`roster_groups[]`), per-athlete availability.
- Read-only dashboard + RSVP buttons; coach attendance tracking.
- **Acceptance:** events filter by group; RSVP persists; availability summary is accurate.
- **Deps:** F01.

### F04 · Roster Management  ✅
**As a** coach **I want** athletes, parents, and coaches in one place **so that** team moms
can find contact info fast.
- Skill-based groups (Beginner/Advanced are NOT age-based), weight/grade/school.
- Parents auto-invited when an athlete is added; tap-to-call / tap-to-email.
- **Acceptance:** filters by group with counts; parent accounts separate from athletes.
- **Deps:** F01.

---

## P1 — Communication Layer (Fast Follow)

The three-tier communication model that makes MatMind sticky.

### F05 · In-App Channels + AI Q&A  ✅
**As a** parent **I want** team channels where I can ask questions **so that** I get answers
without bothering a coach.
- Channels: Announcements, Advanced, Beginner, Tots. Real-time via Supabase Realtime.
- AI Coach auto-answers genuine questions (admin-configurable: Off / Mentions / Smart).
- **Acceptance:** messages sync across devices; AI stays out of normal conversation.
- **Deps:** F02, realtime publication on `messages`.

### F06 · Push Notifications  ✅
**As a** parent **I want** alerts when messages are posted **so that** I don't miss updates.
- Web Push (VAPID); per-channel preferences; channel posts auto-notify (excl. sender).
- **Acceptance:** notification arrives on a second device; per-channel mute works.
- **Deps:** F05, `VITE_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`.

### F07 · Email Broadcasts (SendGrid)  ⬜
**As a** coach **I want** to email the full roster or a subgroup **so that** I can send weekly
newsletters and policy updates.
- One-directional Coach → Roster; filter by group (Tots/Beginner/Advanced/Coaches).
- AI drafts the newsletter on request; coach confirms before send. Log to `broadcasts`.
- **Acceptance:** email delivered to filtered recipients; send logged; unsubscribe honored.
- **Deps:** F04, `SENDGRID_API_KEY`. **Free tier: 100/day.**

### F08 · Knowledge Base  ✅
**As a** coach **I want** to store flyers, policies, and FAQs **so that** the AI answers from
team-specific content.
- Type/paste, **Import from URL**, refresh-from-source. KB injected into AI system prompt.
- **Acceptance:** AI cites KB content; URL import extracts page text.
- **Deps:** F02.

### F16 · In-App Support with MatMind Support AI  ⬜
**As a** coach or parent **I want** a help button always visible in the header **so that**
I can get instant answers or escalate issues without leaving the app.
- **Support persona:** "MatMind Support" — a distinct AI identity separate from the team's
  MatMind AI coach. Knows the product, not your roster.
- **Universal entry point:** Help/support button in the app header, accessible to all users
  (coaches, parents, athletes) on every screen.
- **Dedicated private thread:** support chat is isolated from team channels; no team member
  sees another user's support conversation.
- **Three-tier triage model:**
  - Tier 1 — AI answers instantly (how-to, feature questions, account basics)
  - Tier 2 — AI cannot fully resolve → creates a ticket, human queued (< 4 hr business hours)
  - Tier 3 — Auto-escalated sensitive topics or explicit "talk to a person" → human responds (< 1 business day)
- **Auto-escalation triggers (always T3):** athlete safety concerns, billing disputes, account
  security, FERPA/privacy, explicit request for human.
- **Knowledge base:** product KB built into AI context; grows as resolved T3 tickets are
  reviewed and promoted to KB entries. Separate from the team-specific KB (F08).
- **No phone support** at launch.
- **Data:** `support_tickets`, `support_messages`, `support_kb` tables in Supabase (not
  team-scoped — scoped to `user_id` and optionally `team_id`).
- **Metrics** feed into CEO Dashboard: ticket volume by tier, escalation rate, resolution
  time, KB miss rate.
- **Acceptance:** user taps Help → support thread opens; AI answers a how-to question
  instantly; safety keyword triggers T3 escalation with human-review ticket; resolved T3
  ticket can be promoted to KB; metrics visible in admin view.
- **Deps:** F01 (auth), F02 (AI pattern), F08 (KB pattern).

---

## P2 — Depth & Polish

Round out the experience once the core loop works.

### F09 · SMS — Tournament Day (Twilio)  ⬜
**As a** coach **I want** to text parents on tournament day **so that** urgent info lands fast
in a loud gym.
- "Mat 3, warming up in 10 minutes." Target group or full roster. ~$0.0079/msg.
- **Acceptance:** SMS delivered to opted-in numbers; cost logged.
- **Deps:** F04, `TWILIO_*`.

### F10 · Attendance Tracking & Gamification  ✅
**As a** coach **I want** to take attendance and rank athletes **so that** I can drive
engagement.
- Per-event present/absent; AI composes attendance leaderboards and posts them.
- **Acceptance:** attendance persists; leaderboard reflects records accurately.
- **Deps:** F03.

### F11 · Parent-Facing Experience  ✅
**As a** parent **I want** a focused view **so that** I'm not shown coach-only tools.
- Limited nav, RSVP buttons, Q&A-only AI; no command center.
- **Acceptance:** parents cannot create events or see private coach channel.
- **Deps:** F01, F03, F05.

### F12 · Team Branding & Logo  ✅
**As an** admin **I want** to set team name, colors, and logo **so that** the app feels like
our team.
- `team_settings`; logo upload to Storage; shown on header + login.
- **Acceptance:** branding applies app-wide immediately; logo persists.
- **Deps:** F01, Supabase Storage bucket.

---

## P3 — Scale & Growth

Post-launch investments for multi-team / league operation.

### F13 · TeamSnap Data Import  ⬜
**As a** coach migrating from TeamSnap **I want** to import my roster via CSV **so that** I
don't re-enter 80 athletes.
- CSV → athletes + parent links; dedupe by email; preview before commit.
- **Acceptance:** import maps fields correctly; parents auto-invited.
- **Deps:** F04.

### F14 · Multi-Team Admin / League Dashboard  ⬜
**As a** program director **I want** to manage several teams **so that** I can run a league.
- Super-admin cross-team access; per-team metrics; team switcher.
- **Acceptance:** super admin manages all teams without cross-tenant leakage.
- **Deps:** F01, `super_admins`.

### F15 · Offline Mode & PWA Polish  ⬜
**As a** user in a dead-zone gym **I want** the app to work offline **so that** I can still
view schedule/roster.
- Workbox runtime cache for read data; reliable SW auto-update; install prompts.
- **Acceptance:** schedule/roster render offline; new builds reach devices reliably.
- **Deps:** vite-plugin-pwa, service worker.

---

## CEO Operations Dashboard

Internal operator dashboard at `/admin`. Super-admin only. Code-split from the main app.
Full spec: [`docs/ceo-dashboard-features.md`](../ceo-dashboard-features.md)

### D01 · Admin Auth & Route Guard  ⬜ P0
**As a** MatMind operator **I want** a protected `/admin` route **so that** only super admins can access the dashboard.
- `super_admin` role on `profiles`; JWT custom claim; server-side verification on all `api/admin/*` functions.
- Client route guard redirects non-super-admins to `/`.
- **Acceptance:** non-super-admin JWT cannot access `/admin` or any `api/admin/*` endpoint.
- **Deps:** F01 (auth), Supabase `profiles` table.

### D02 · Dashboard Shell & Overview Page  ⬜ P0
**As a** MatMind operator **I want** a sidebar-nav shell with an overview page **so that** I can navigate all dashboard sections.
- Lazy-loaded `src/admin/` bundle. Sidebar: Health, Tenants, Analytics, Support, Dev, Marketing, Finance.
- Overview page: summary cards (one per section) with key metric + link to full section.
- **Acceptance:** shell renders at `/admin`; sidebar navigation works; zero admin code in main bundle (`npm run build` chunk analysis).
- **Deps:** D01.

### D03 · System Health  ⬜ P1
**As a** MatMind operator **I want** to see API uptime and latency **so that** I know the platform is healthy.
- `GET /api/admin/health` endpoint; `system_health_log` table written by Vercel cron every 5 min.
- Dashboard view: uptime %, p50/p95 latency, error rate, last 24 h sparkline.
- **Acceptance:** cron inserts rows; dashboard reads them; `status = 'down'` turns card red.
- **Deps:** D01, D02.

### D04 · Tenant Operations  ⬜ P1
**As a** MatMind operator **I want** to see all teams and their engagement **so that** I can spot at-risk tenants.
- Tenant list with counts (athletes, parents, events last 30 days, last login).
- At-risk flag: zero logins in 14+ days. Detail view per team. Read-only impersonation link.
- **Acceptance:** all teams listed; at-risk teams flagged; detail view shows live counts from Supabase.
- **Deps:** D01, D02.

### D05 · Support View  ⬜ P1
**As a** MatMind operator **I want** to see and respond to open support tickets **so that** T3 escalations don't go unanswered.
- Ticket queue sorted by age; filter by tier/status. Thread view with reply + close + promote-to-KB actions.
- Metrics: open count by tier, AI resolution rate, median response time.
- **Acceptance:** operator can reply to T3 ticket from `/admin/support`; reply appears in user's support thread; ticket closeable.
- **Deps:** D01, D02, F16 (support tables).

### D06 · Usage Analytics  ⬜ P2
**As a** MatMind operator **I want** to see DAU/MAU, feature usage, and AI token costs **so that** I understand product health and cost.
- `ai_call_log` and `feature_events` tables. 30-day sparklines, feature breakdown bar chart.
- Token cost computed client-side: `(input * $1 + output * $5) / 1M`.
- **Acceptance:** AI call count matches manual count in Anthropic console (±5%); cost estimate visible.
- **Deps:** D01, D02, D04.

### D07 · Development View  ⬜ P2
**As a** MatMind operator **I want** to see sprint status, open bugs, and deploy history **so that** I know what's in flight.
- GitHub API: last 5 commits on `main`, open `bug`-labeled issues. Vercel API: last 10 deployments.
- Latest QA report displayed inline (reads `docs/qa/reports/` via GitHub API).
- **Acceptance:** commits and deploys display correctly; QA result shows last run date and pass/fail.
- **Deps:** D01, D02, `GITHUB_TOKEN`, `VERCEL_TOKEN`.

### D08 · Marketing View  ⬜ P3
**As a** MatMind operator **I want** to see funnel metrics and CPA by channel **so that** I know what's driving growth.
- Manual input (week, channel, leads, spend) before Facebook API; upgrades to live data post-integration.
- **Acceptance:** operator can log weekly marketing snapshot; CPA computed and displayed.
- **Deps:** D01, D02, `docs/facebook-funnel-automation.md` Phase 2.

### D09 · Finance View  ⬜ P3
**As a** MatMind operator **I want** to see MRR, LTV, and CAC **so that** I understand unit economics.
- Stripe integration: subscriptions, events, churn. Computed metrics: LTV, CAC, payback period.
- **Acceptance:** MRR matches Stripe dashboard; churn rate accurate.
- **Deps:** D01, D02, Stripe account + `STRIPE_SECRET_KEY`.

### D10 · Quick Actions  ⬜ P3
**As a** MatMind operator **I want** one-click actions (create tenant, trigger QA, force redeploy) **so that** I don't have to leave the dashboard for common ops tasks.
- All actions require confirmation dialog. All logged to `admin_audit_log`.
- **Acceptance:** create tenant action inserts team row and sends welcome email; QA trigger fires Cowork webhook.
- **Deps:** D01–D07.

---

## Backlog discipline

- Every feature ships behind a **story** (`docs/backlog/stories/`) with acceptance
  criteria and test cases before code starts.
- Every release passes the **QA checklist** (`docs/qa/test-checklist.md`).
- Priorities are reviewed weekly; a P-bump requires a one-line rationale here.
