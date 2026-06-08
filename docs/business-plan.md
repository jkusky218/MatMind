# MatMind — Business Plan

> Living document. Updated as product, operations, and infrastructure decisions are made.
> Source of truth for business strategy, feature direction, and operational models.

---

## What is MatMind?

MatMind is an AI-powered Progressive Web App (PWA) for managing youth wrestling teams. Designed by Joey Kusky, Head Coach of Lovett Wrestling (The Lovett School, Atlanta, GA), it replaces TeamSnap with a smarter, conversational-first experience.

The core innovation: instead of navigating menus and forms, coaches interact with an AI assistant through natural language. "Marcus is sick, pull him from Saturday" becomes a single message that updates availability, notifies parents, and flags the open weight class.

---

## Product Vision

### Hybrid Interface Model
- **Conversational-first**: The primary input method is chat. Coaches and parents tell MatMind what they need in plain English.
- **Visual dashboards for context**: Schedule, Roster, and Availability views are read-only dashboards. Users look at them to see state, but modify state through conversation.
- **The AI is the app**: MatMind AI isn't a feature inside the app — it IS the app. The data layer exists underneath, but the user rarely touches traditional UI.

### Target Users (Launch)
| Persona | Count | Primary Need |
|---------|-------|-------------|
| Head Coach | 1 | Run the team, manage lineups, communicate |
| Assistant / Group Coaches | 5 | Coordinate their groups, view schedule |
| Athletes | 60–80 | Know where to be, track attendance |
| Parents/Guardians | 100+ | RSVP, get updates, ask questions |

### Team Scale
- 6 coaches, 60–80 athletes, 100+ parents at launch
- Designed to scale to multiple teams and leagues (P3)

---

## Communication Architecture

Three tiers, each with a distinct purpose:

| Tier | Channel | Direction | Use Case | Provider |
|------|---------|-----------|----------|----------|
| 1 | In-App Chat | Bi-directional | Everyday coordination, Q&A | Supabase Realtime |
| 2 | Email | Coach → Roster | Weekly newsletters, policy updates | SendGrid |
| 3 | SMS | Coach → Roster | Tournament-day urgent alerts | Twilio |

### Channel Structure
- **MatMind AI** — Private command center for coaches only
- **# Announcements** — Team-wide updates from coaches
- **# Advanced** — Skill-based group channel (NOT age-based)
- **# Beginner** — Skill-based group channel (NOT age-based)
- **# Tots** — Youngest wrestlers channel
- **🔒 Coaches Only** — Private staff-only channel

---

## Support Operations

### Philosophy
Support for a youth sports team app must be fast, private, and low-friction. Coaches and parents don't want to leave the app to get help, and they shouldn't have to. The support layer is built into the product, not bolted on.

The support persona is **MatMind Support** — a distinct AI identity separate from the team's MatMind AI coach. This separation is intentional: the team AI knows your roster and speaks as your team assistant; support AI knows the product and speaks as MatMind the company.

### Access
- A **Help / Support button** is present in the app header, accessible to all users (coaches, parents, athletes) at all times, regardless of which screen they're on.
- Tapping it opens a **dedicated private support thread** — completely separate from team channels. No one on the team sees it.
- No phone support at launch.

### Three-Tier Triage Model

| Tier | Handler | Trigger | Response Time |
|------|---------|---------|---------------|
| **T1 — Instant AI** | MatMind Support AI | Common questions (how-to, feature questions, account basics) | < 30 seconds |
| **T2 — AI Creates Ticket** | AI writes ticket, human queued | Complex issues AI can't fully resolve; user wants follow-up | < 4 hours (business hours) |
| **T3 — Human Responds** | MatMind support staff | Auto-escalated sensitive topics; user explicitly requested human | < 1 business day |

### Scope: Product & Billing Only
MatMind Support handles **app questions and billing only**. Anything outside that scope — team matters, athlete concerns, practice questions, conduct, interpersonal issues — receives a single consistent response: *"Please contact your coach directly."* No ticket is created for out-of-scope topics.

This applies consistently across all three AI surfaces:
- **MatMind Support** (help button) — out-of-scope → "Please contact your coach."
- **MatMind AI in group channels** — conduct/safety questions → "That's something a coach needs to address. Please reach out to your coach directly." No AI answer given.
- **MatMind AI private command center** — same redirect for conduct/safety questions.

### Auto-Escalation Triggers (always go to T3)
The AI must immediately create a human-reviewed ticket when any of the following are detected:
- **Billing disputes** — payment issues, subscription complaints, refund requests
- **Account security** — suspected unauthorized access, password compromise
- **Legal / FERPA** — requests involving student records, privacy complaints, data deletion
- **Explicit request** — user says "I want to talk to a person" or equivalent

### Knowledge Base
- The support AI's context includes a product knowledge base covering features, FAQs, and known issues.
- When a human resolves a T3 ticket, the resolution is reviewed and optionally added back to the KB — the KB grows from real support interactions.
- The KB is separate from the team-specific KB (F08) used by the team AI for roster/FAQ context.

### Support Data Model
```
support_tickets
  id, team_id, user_id, status (open|pending|resolved|escalated),
  tier (1|2|3), subject, created_at, resolved_at, resolved_by

support_messages
  id, ticket_id, sender_type (user|ai|human_agent), body, created_at

support_kb
  id, question, answer, source_ticket_id, created_at, updated_at
```

### Support Metrics → CEO Dashboard
All support interactions feed into the CEO Dashboard (see P3 roadmap):
- Ticket volume by tier / day / team
- Escalation rate (% of tickets reaching T3)
- Resolution time by tier
- Top 10 KB misses (questions AI couldn't answer)
- CSAT score (optional, post-MVP)

---

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React 18 + Vite | Fast builds, great PWA support |
| Database | Supabase (Postgres) | Free tier, real-time, RLS, auth built-in |
| Auth | Supabase Auth | Email/password + magic link |
| Real-time | Supabase Realtime | Live chat messages |
| AI | Anthropic Claude API (Haiku 4.5) | Fast, cheap, smart enough for scheduling/roster |
| Email | SendGrid | Free tier covers 100/day |
| SMS | Twilio | ~$0.0079/message |
| PWA | vite-plugin-pwa + Workbox | Installable without app store |
| Hosting | Vercel | Auto-deploy from GitHub, serverless functions |

### Key Architecture Decisions
1. **PWA over React Native** — installable without app store, shareable via link, single codebase
2. **Conversational-first over traditional UI** — agentic AI is the primary interface
3. **Haiku 4.5 over Sonnet** — fast and cheap for scheduling/roster; route complex queries to Sonnet if needed
4. **Supabase over Firebase** — Postgres + RLS is more robust; real-time built in; better free tier
5. **Skill-based groups, NOT age-based** — Beginner and Advanced are skill tiers
6. **Prompt caching** — system prompt with roster/schedule context reused across calls, cutting input costs ~90%
7. **Separate support persona** — MatMind Support AI is distinct from the team AI to avoid role confusion

---

## Phase Roadmap

### Phase 1: Foundation ✅
MVP scaffold, Supabase schema, Vercel deployment, auth integration, prototype UI.

### Phase 2: Real AI Integration (Current)
- Replace hardcoded AI responses with Claude API (Haiku 4.5)
- Build system prompt with team context (roster, schedule, FAQ)
- Tool use so Claude can modify data (create events, update availability, draft messages)
- Vercel serverless functions for API calls (keeps keys server-side)

### Phase 3: Communication Layer
- Email via SendGrid (weekly newsletters, coach broadcasts)
- SMS via Twilio (tournament-day urgent alerts)
- Real-time chat via Supabase Realtime
- AI Coach in group channels (auto-responds to parent questions)

### Phase 4: Support Operations
- MatMind Support AI with dedicated support thread
- Three-tier triage model
- KB that grows from resolved tickets
- Support metrics

### Phase 5: PWA Polish
- Service worker + offline capability
- Push notifications (FCM)
- Add to Home Screen prompt
- Parent-facing experience refinement

### Phase 6: Scale
- TeamSnap data import
- Multi-team support
- League management
- CEO Dashboard with support + product metrics

---

## SDLC Infrastructure

### Completed ✅
| Item | Status | Notes |
|------|--------|-------|
| GitHub repository | ✅ Done | `jkusky218/MatMind`, public |
| Vercel deployment | ✅ Done | Auto-deploys from `main`; preview deploys from `dev` |
| Supabase project | ✅ Done | Schema deployed (`001_initial_schema.sql`) |
| `dev` branch | ✅ Done | All feature work branches from `dev` |
| Branch protection on `main` | ✅ Done | PRs required; no direct push |
| Story pipeline | ✅ Done | `docs/backlog/cowork-story-generator-prompt.md` |
| QA agent prompt | ✅ Done | `docs/qa/cowork-qa-prompt.md` |
| Issue templates | ✅ Done | `.github/ISSUE_TEMPLATE/bug.md` + `story.md` |
| Sprint 001 stories (F01–F05) | ✅ Done | `docs/backlog/stories/sprint-001.md` |
| QA scheduled at 5 AM | ✅ Done | Active Cowork scheduled task — runs daily at 5AM. Four-step pipeline: (1) Smart skip — checks `git log main..dev`; skips with one-line report if no new commits. (2) Dual-mode test — live browser via Claude in Chrome against Vercel dev preview, or code-review fallback (imports, schema, RLS, build, branding). (3) Files GitHub Issues via `gh issue create` for each ❌; falls back to saving issue markdown files if CLI unavailable. (4) Writes a ready-to-paste Claude Code fix prompt to `docs/qa/reports/fix-prompt-[date].md` so bugs can be resolved first thing in the morning. |
| QA → GitHub Issues pipeline | ✅ Done | Built into Step 3 of the scheduled task — `gh issue create` per ❌ with bug template; falls back to markdown issue files if GitHub CLI is unavailable |
| Morning fix-prompt generation | ✅ Done | Built into Step 4 of the scheduled task — auto-generates `docs/qa/reports/fix-prompt-[date].md` listing every failure with file, line, and specific fix; ready to paste into Claude Code |

### In Progress 🚧
| Item | Status | Notes |
|------|--------|-------|
| F01 Multi-tenant auth | ✅ Done | Subdomain routing, TeamContext, magic link |
| F02 AI Command Center | ⬜ Planned | Next sprint |
| F03 Schedule & Availability | ⬜ Planned | Next sprint |
| F04 Roster Management | ⬜ Planned | Next sprint |

### Planned ⬜
- Staging environment (separate Supabase project)
- E2E tests (Playwright)
- Error monitoring (Sentry)
- Analytics (PostHog or Plausible)
- CEO Dashboard

---

## Branding

**Lovett School colors:**
- Navy `#1B3A5C` (primary) / Navy Dark `#0F2440` / Navy Light `#2A4F7A`
- Columbia Blue `#6BADE4` (secondary) / Columbia Light `#E8F2FC`
- Gold `#C4A44A` (accent, coaches + tournaments)

**Group colors:** Coaches = Gold, Advanced = Navy, Beginner = Columbia Blue, Tots = Purple `#7B5EA7`

**Mascot:** Lions 🦁
