# CLAUDE.md — MatMind Project Brief

This file provides full context for AI-assisted development of MatMind.

## What is MatMind?

MatMind is an AI-powered Progressive Web App (PWA) for managing youth wrestling teams. It was designed by Joey Kusky, Head Coach of Lovett Wrestling (The Lovett School, Atlanta, GA), to replace TeamSnap with a smarter, conversational-first experience.

The core innovation: instead of navigating menus and forms, coaches interact with an AI assistant through natural language. "Marcus is sick, pull him from Saturday" becomes a single message that updates availability, notifies parents, and flags the open weight class.

## Product Vision

### Hybrid Interface Model
- **Conversational-first**: The primary input method is chat. Coaches and parents tell MatMind what they need in plain English.
- **Visual dashboards for context**: Schedule, Roster, and Availability views exist as read-only dashboards. Users look at them to see state, but modify state through conversation.
- **The AI is the app**: MatMind AI isn't a feature inside the app — it IS the app. The data layer exists underneath, but the user rarely touches traditional UI.

### Communication Architecture
Three tiers of communication, each with a distinct purpose:

1. **Email** (Coach → Roster): Formal channel. Weekly newsletters, policy updates. Coach broadcasts to full roster or filtered subgroups (Tots, Beginner, Advanced, Coaches). One-directional. Powered by SendGrid.

2. **SMS** (Tournament Day): Urgent, on-site communication. "Mat 3, warming up in 10 minutes." Fast delivery when parents are in a loud gym. Powered by Twilio.

3. **In-App Chat** (Channels): Everyday communication. General conversation, questions, coordination. The AI Coach lives here, answering parent questions and routing urgent items to coaches.

### Channel Structure
- **MatMind AI** — Private command center for coaches. This is where coaches give natural language commands. No one else sees this channel.
- **# Announcements** — Team-wide updates from coaches.
- **# Advanced** — Skill-based group channel (NOT age-based).
- **# Beginner** — Skill-based group channel (NOT age-based).
- **# Tots** — Youngest wrestlers channel.
- **🔒 Coaches Only** — Private staff-only channel for lineup discussions, logistics, internal coordination.

### AI Coach Behavior
The AI Coach (present in group channels) should:
- Answer common parent questions by pulling from team FAQ, website content, and past email communications
- Handle availability updates from natural language: "Johnnie is sick today" → updates availability, confirms back
- Draft and send communications on coach's behalf after confirmation
- Understand roster groups and filter actions accordingly
- Never make changes without confirming with the coach first (in the private AI channel)

### Roster Groups
Groups are NOT age-based for Beginner and Advanced. They are SKILL-based.
- **Coaches** — Coaching staff (Head Coach, Assistant Coach, Tots Coach, Beginner Coach, Advanced Coach, Volunteer Coach)
- **Advanced** — Skill-based group, can include athletes of any age/grade
- **Beginner** — Skill-based group, can include athletes of any age/grade  
- **Tots** — Youngest wrestlers

### Team Scale
- 6 coaches at launch
- 60-80 athletes across groups
- 100+ parents (many athletes have 2 parents/guardians on file)
- Designed to scale to multiple teams and leagues

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 18 + Vite | Fast builds, great PWA support |
| Database | Supabase (Postgres) | Free tier, real-time, RLS, auth built-in |
| Auth | Supabase Auth | Email/password + magic link |
| Real-time | Supabase Realtime | Live chat messages |
| AI | Anthropic Claude API (Haiku 4.5) | Fast, cheap ($1/$5 per 1M tokens), smart enough for this use case |
| Email | SendGrid | Free tier covers 100/day |
| SMS | Twilio | ~$0.0079/message |
| PWA | vite-plugin-pwa + Workbox | Installable without app store |
| Hosting | Vercel | Auto-deploy from GitHub, serverless functions |

## Branding

Lovett School colors:
- **Navy**: #1B3A5C (primary)
- **Navy Dark**: #0F2440
- **Navy Light**: #2A4F7A
- **Columbia Blue**: #6BADE4 (secondary)
- **Columbia Light**: #E8F2FC
- **Gold**: #C4A44A (accent, used for coaches and tournaments)
- **Gold Light**: #FAF3E0

Group colors:
- Coaches: Gold (#C4A44A)
- Advanced: Navy (#1B3A5C)
- Beginner: Columbia Blue (#6BADE4)
- Tots: Purple (#7B5EA7)

Mascot: Lions 🦁

## Database Schema

The full schema is in `supabase/migrations/001_initial_schema.sql`. Key tables:
- **teams** — multi-team support with custom branding
- **profiles** — extends Supabase auth.users with role (coach/parent/admin)
- **athletes** — wrestlers with weight, grade, school, roster_group
- **athlete_parents** — many-to-many link (each athlete can have 2 parents)
- **coaches** — staff with titles and optional group assignment
- **events** — practices, matches, tournaments with group filtering
- **availability** — per-athlete RSVP per event
- **channels** — communication channels per group
- **messages** — real-time in-app messages with Supabase Realtime
- **broadcasts** — email/SMS log
- **ai_conversations** — private coach-AI chat history (JSONB)

All tables have Row Level Security (RLS) ensuring data isolation.

## Project Structure

```
matmind/
├── public/                 # Static assets, PWA icons
├── src/
│   ├── components/         # Reusable UI components
│   │   └── MatMindPrototype.jsx  # Full working prototype (reference)
│   ├── hooks/              # React hooks (useAuth, etc.)
│   ├── lib/                # Supabase client, API helpers
│   ├── pages/              # Page-level components
│   ├── styles/             # Global CSS with brand tokens
│   ├── App.jsx             # Root component with auth routing
│   └── main.jsx            # Entry point
├── supabase/migrations/    # Database schema SQL
├── vercel.json             # Vercel deployment config
├── .env.example            # Environment variable template
└── CLAUDE.md               # This file
```

## Current State

- ✅ Full interactive prototype built (src/components/MatMindPrototype.jsx)
- ✅ Hybrid channel system with AI command center + group channels
- ✅ Login screen with coach/parent role selection
- ✅ Roster with weight, grade, school, parent 1/2 contacts, skill-based groups, coaches group
- ✅ Schedule with event types, group filtering, availability tracking
- ✅ Database schema with RLS policies
- ✅ Auth hook with demo mode fallback
- ✅ PWA config (vite-plugin-pwa)
- ✅ Vercel deployment config

## Phase Plan

### Phase 1: Foundation (CURRENT)
- GitHub repo setup
- Supabase project creation and schema deployment
- Vercel deployment
- Auth integration (real login replaces demo mode)

### Phase 2: Real AI Integration
- Replace hardcoded AI responses with Claude API (Haiku 4.5)
- Build system prompt with team context (roster, schedule, FAQ)
- Implement tool use so Claude can modify data (create events, update availability, draft messages)
- Use Vercel serverless functions for API calls (keeps ANTHROPIC_API_KEY server-side)

### Phase 3: Communication Layer
- Email via SendGrid (weekly newsletters, coach broadcasts)
- SMS via Twilio (tournament-day urgent alerts)
- Real-time chat via Supabase Realtime (channel messages)
- AI Coach in group channels (auto-responds to parent questions)

### Phase 4: PWA Polish
- Service worker + offline capability
- Push notifications (FCM)
- Add to Home Screen prompt
- Parent-facing experience (limited views, RSVP buttons)

### Phase 5: Scale
- TeamSnap data import
- Multi-team support
- League management
- Admin dashboard

## Key Decisions Made

1. **PWA over React Native** — installable without app store, shareable via link, single codebase
2. **Conversational-first over traditional UI** — demonstrates agentic AI thinking, more innovative for portfolio
3. **Hybrid model** — AI chat as primary input + visual dashboards for context (not pure chat, not pure UI)
4. **Haiku 4.5 over Sonnet** — fast and cheap enough for scheduling/roster tasks; route complex strategy questions to Sonnet if needed
5. **Supabase over Firebase** — Postgres + RLS is more robust; real-time built in; better free tier
6. **Skill-based groups, NOT age-based** — Beginner and Advanced are determined by skill level, not grade
7. **Prompt caching** — system prompt with roster/schedule context reused across calls, cutting input costs by ~90%

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
```

## Environment Variables

See `.env.example` for the full list. The app runs in demo mode without Supabase credentials.
