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

## Backlog discipline

- Every feature ships behind a **story** (`docs/backlog/stories/`) with acceptance
  criteria and test cases before code starts.
- Every release passes the **QA checklist** (`docs/qa/test-checklist.md`).
- Priorities are reviewed weekly; a P-bump requires a one-line rationale here.
