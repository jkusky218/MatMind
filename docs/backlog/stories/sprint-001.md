# Sprint 001 — P0 Stories

> Auto-generated stories for the four P0 launch-critical features plus F05 (first P1 feature).
> These stories are **plan-only** — no code has been written.

---

# F01 · Multi-tenant Auth & Subdomain Routing

- **Priority:** P0
- **Status:** Planned
- **Epic:** Auth
- **Estimate:** M

## Story
As a coach,
I want my team's app reachable at its own subdomain with fully isolated data,
so that each team's roster, schedule, and messages stay private from every other team.

## Context & rationale
MatMind is designed to scale to multiple programs and eventually a league. Every data
table carries a `team_id` foreign key and Supabase Row Level Security (RLS) policies
enforce that users can only read/write rows belonging to their own team. Subdomain
routing (`<slug>.mat-mind.com`) lets Vercel resolve the correct `team_id` before auth
so the login page is already branded for that team — eliminating the "which org are you
from?" step that plagues multi-tenant apps.

## Acceptance criteria
1. Given a coach navigates to `lovett.mat-mind.com`, when the page loads, then the
   login screen shows the Lovett team name/logo and all subsequent API calls are
   scoped to Lovett's `team_id`.
2. Given two teams exist (Lovett, Riverside), when a Lovett-authenticated user calls
   any Supabase query, then RLS returns zero rows belonging to Riverside.
3. Given an unknown subdomain (`unknown.mat-mind.com`), when the page loads, then the
   app shows a "Team not found" error and does not render a login form.
4. Given a valid coach email + password, when they submit the login form, then
   Supabase Auth issues a session and the app routes to the main dashboard.
5. Given a magic-link email is requested, when the user clicks the link, then they are
   authenticated without a password and land on the dashboard.
6. Given a user's session expires, when they attempt any authenticated action, then
   they are redirected to login without a flash of protected content.

## Out of scope
- OAuth / social login (Google, Apple) — future story
- Role-based nav differences between coach and parent — covered by F11
- Vercel custom domain provisioning UI — manual ops task at launch

## Technical notes
- **Data:** `teams` table (`id`, `name`, `slug`, `branding_json`); `profiles` table
  extends `auth.users` with `team_id` and `role` (`coach | parent | admin`). No new
  migration needed if `001_initial_schema.sql` is already applied.
- **API:** `/api/team?slug=<slug>` — public (no auth) endpoint that returns
  `{ team_id, name, branding }` given a subdomain slug. Used pre-login to brand the
  page. Lives in `api/team.js` (Vercel serverless).
- **Client:** `src/hooks/useAuth.js` wraps `supabase.auth.*`; reads team context from
  `window.location.hostname`; stores `team_id` in React context via
  `src/lib/TeamContext.jsx`. `src/App.jsx` gates all routes on auth state.
- **Env/config:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (client-side);
  `SUPABASE_SERVICE_ROLE_KEY` (server-side, for admin operations). Vercel wildcard
  domain `*.mat-mind.com` must be configured.
- **Multi-tenancy:** every RLS policy uses `auth.jwt() ->> 'team_id'` (set as a
  custom claim on the JWT at login via a Supabase Auth hook or `profiles` join).
  Confirm the claim is present before marking DoD complete.

## Test cases
1. **Happy path login** — navigate to `lovett.mat-mind.com`, enter valid credentials →
   dashboard loads, header shows "Lovett Wrestling."
2. **Magic link** — request magic link, click email link → authenticated, no password
   entry required.
3. **Cross-tenant isolation** — with Lovett session, run `SELECT * FROM athletes` in
   browser console via Supabase JS client → returns only Lovett athletes (0 Riverside).
4. **Unknown subdomain** — navigate to `nobody.mat-mind.com` → "Team not found" page,
   no login form rendered.
5. **Expired session redirect** — manually expire JWT (or wait), attempt to load
   `/schedule` → redirected to login, no protected content visible.
6. **Wrong password** — enter invalid credentials → error message shown inline, no
   crash.
7. **RLS abuse — direct API call** — with Lovett JWT, craft a `GET /rest/v1/athletes`
   request with a forged `team_id` filter for Riverside → Supabase returns 0 rows.
8. **Branding renders** — Lovett subdomain → login page uses Navy `#1B3A5C` and shows
   Lions branding, not a generic MatMind logo.

## Dependencies
- Supabase project created; `001_initial_schema.sql` applied.
- Vercel project connected to GitHub; wildcard domain configured.

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] Migration written + applied; RLS verified for cross-tenant isolation
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list status, PROJECT_STATE if applicable)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, supabase/migrations/001_initial_schema.sql, src/hooks/useAuth.js,
and src/App.jsx for context.

Implement F01 — Multi-tenant Auth & Subdomain Routing:

1. Create `api/team.js` (Vercel serverless) — accepts `?slug=` query param, queries
   the `teams` table with the service-role key, returns `{ team_id, name, branding }`
   or 404 if not found. No auth required on this endpoint.

2. Create `src/lib/TeamContext.jsx` — on mount, reads `window.location.hostname`,
   strips the TLD to get the slug, calls `/api/team?slug=`, and stores the result in
   React context. Expose `useTeam()` hook.

3. Update `src/hooks/useAuth.js` — after successful login, confirm the Supabase JWT
   custom claim `team_id` matches the team resolved by TeamContext. If mismatch, sign
   out and show an error.

4. Update `src/App.jsx` — wrap the app in `<TeamProvider>`; if TeamContext returns a
   404, render a "Team not found" page before showing any auth UI.

5. Verify RLS: write a quick test script (`scripts/test-rls.js`) that creates two
   teams, inserts one athlete each, authenticates as Team A, and asserts Team B's
   athlete is invisible.

Do NOT build any UI beyond what's needed to satisfy the acceptance criteria in
docs/backlog/stories/sprint-001.md (F01 section). No new nav, no settings UI.
```

---

# F02 · Conversational AI Command Center

- **Priority:** P0
- **Status:** Planned
- **Epic:** AI
- **Estimate:** M

## Story
As a coach,
I want to manage the team by typing plain English into a private chat channel,
so that I can create events, update availability, and post announcements without
navigating menus or filling out forms.

## Context & rationale
The AI is not a feature inside MatMind — it _is_ the app. The "MatMind AI" channel is
the coach's primary interface. Claude Haiku 4.5 runs via a Vercel serverless function
with a system prompt that is pre-loaded with the team's roster, upcoming schedule, and
FAQ (prompt caching cuts repeat input cost ~90%). The AI uses Claude tool use to take
side-effectful actions and always confirms with the coach before committing changes.

## Acceptance criteria
1. Given a coach sends "Add practice Thursday at 6pm in the wrestling room", when the
   AI responds, then it presents a confirmation summary ("Create: Practice · Thu Jun 11
   · 6:00 PM · Wrestling Room — confirm?") before writing to the `events` table.
2. Given the coach replies "yes" or "confirm", when the AI processes the confirmation,
   then the event appears in the Schedule view and the AI acknowledges success.
3. Given a coach asks "Who's confirmed for Peach State?", when the AI responds, then
   it returns a list drawn from live `availability` rows (not fabricated data).
4. Given a coach sends "Pull Marcus from Saturday", when the AI responds, then it
   confirms the availability update before writing to `availability` and names Marcus
   and the event explicitly.
5. Given the system prompt is cached, when a second message is sent in the same
   session, then the Anthropic API logs a cache hit for the system prompt tokens
   (observable in Vercel function logs).
6. Given the AI channel receives a message from a parent (not a coach), when the
   message arrives, then the AI does not respond — this channel is coach-only.
7. Given a Claude API error occurs, when the coach sends a message, then the UI shows
   a friendly error ("AI is unavailable — try again") and does not expose API details.

## Out of scope
- AI responses in group channels (Announcements, Advanced, Beginner, Tots) — F05
- Email/SMS drafting and sending — F07, F09
- Knowledge base injection — F08
- Parent-facing AI Q&A — F11

## Technical notes
- **Data:** `ai_conversations` table stores JSONB message history per coach per team.
  `events`, `availability`, `messages` are the primary write targets for tool use.
- **API:** `api/chat.js` — Vercel serverless. Accepts `{ message, conversation_id, team_id }`.
  Loads roster + next-30-days events from Supabase, builds system prompt, calls
  `anthropic.messages.create` with `betas: ["prompt-caching-2024-07-31"]`. Defines
  tools: `create_event`, `update_availability`, `post_to_channel`, `get_availability`.
  Returns `{ reply, tool_calls_made }`.
- **Client:** `src/components/AICommandCenter.jsx` renders the private channel thread.
  Uses `src/hooks/useAIChat.js` for optimistic message state. Confirmation UI: when
  `tool_calls_made` is present in the response, render a confirm/cancel card before
  the next message is sent.
- **Env/config:** `ANTHROPIC_API_KEY` (server-side only, never exposed to client).
  Model: `claude-haiku-4-5`. Cache breakpoint on the system prompt block.
- **Multi-tenancy:** `team_id` is read from the verified JWT in `api/chat.js` — never
  trusted from the request body. Roster/schedule context loaded with the service-role
  key but filtered to `team_id`.

## Test cases
1. **Create event flow** — type "Add practice Friday 5pm", confirm → event appears in
   Schedule tab with correct date/time.
2. **Availability query** — ask "Who's coming to Tuesday's practice?" → AI lists names
   from `availability` (not hallucinated).
3. **Availability update** — type "Marcus can't make Saturday", confirm → `availability`
   row updated; AI says "Done — Marcus marked unavailable for [event name]."
4. **Cancel confirmation** — AI asks to confirm event creation, coach types "cancel" →
   no event written, AI acknowledges.
5. **Prompt cache hit** — send two messages in one session → Vercel logs show
   `cache_read_input_tokens > 0` on second call.
6. **Parent blocked** — log in as a parent, try to access the AI channel URL directly →
   channel is not rendered; no AI response even via direct API call with parent JWT.
7. **API key missing** — remove `ANTHROPIC_API_KEY` from env → UI shows friendly error,
   does not expose key name or stack trace.
8. **Long conversation** — send 20 messages in a session → conversation history
   truncated gracefully (last N turns), no token-limit crash.

## Dependencies
- F01 (auth + team_id scoping) must be complete.
- F03 (events/availability tables) must be complete.
- F04 (roster in Supabase) must be complete.
- `ANTHROPIC_API_KEY` set in Vercel environment.

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] Migration written + applied; RLS verified for cross-tenant isolation
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list status, PROJECT_STATE if applicable)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, src/components/MatMindPrototype.jsx (for the existing AI chat UI
reference), supabase/migrations/001_initial_schema.sql, and
docs/backlog/stories/sprint-001.md (F02 section) for full context.

Implement F02 — Conversational AI Command Center:

1. Create `api/chat.js` (Vercel serverless):
   - Authenticate the request using the Supabase JWT (reject non-coach roles).
   - Load roster (athletes + coaches) and next-30-days events filtered to `team_id`.
   - Build a system prompt with that context; mark it as a cache breakpoint using
     Anthropic prompt caching (`"cache_control": {"type": "ephemeral"}`).
   - Define tools: `create_event`, `update_availability`, `post_to_channel`,
     `get_availability` — each with a JSON schema Haiku can call.
   - Call `claude-haiku-4-5` with `betas: ["prompt-caching-2024-07-31"]`.
   - For tool calls: do NOT execute them immediately. Return `{ reply, pending_tool_call }`
     so the client can show a confirmation card.
   - On a follow-up request with `{ confirmed: true, pending_tool_call }`, execute the
     tool (write to Supabase), then return the final reply.

2. Create `src/hooks/useAIChat.js` — manages message history, calls `/api/chat`,
   handles the pending_tool_call confirmation state.

3. Update `src/components/AICommandCenter.jsx` (or create if absent) — renders the
   private MatMind AI channel. Shows a ConfirmationCard component when a tool call is
   pending. Coach-only: hide/disable for parent role.

Do not implement group-channel AI (F05), email drafting (F07), or KB injection (F08).
```

---

# F03 · Schedule & Availability

- **Priority:** P0
- **Status:** Planned
- **Epic:** Schedule
- **Estimate:** M

## Story
As a parent,
I want to see all upcoming practices, matches, and tournaments and submit my child's
RSVP,
so that the coach can plan lineups and I never miss an event.

## Context & rationale
Schedule and availability are the operational heartbeat of the team. Coaches create
events via the AI Command Center (F02) or directly; parents RSVP through a simple
button. Events are group-targeted (`roster_groups[]`) so Tots parents don't see
Advanced-only scrimmages. Coaches see the full availability summary per event to build
lineups, while parents see only their child's status. This is a read-heavy screen —
the data is written either by AI tool calls or a coach form.

## Acceptance criteria
1. Given events exist in the `events` table, when a coach opens the Schedule tab, then
   all events are shown sorted by date with type badge (Practice / Match / Tournament)
   and targeted group labels.
2. Given a parent is logged in for athlete "Marcus", when they open the Schedule tab,
   then they see only events targeting Marcus's roster group (e.g. Advanced) plus
   All-team events.
3. Given an event exists, when a parent taps "Going" or "Not Going", then the
   `availability` row for that athlete + event is created or updated and the button
   state reflects the new value immediately (optimistic UI).
4. Given a coach views an event, when they open the attendance panel, then they see a
   count and list of confirmed / declined / no-response athletes for that event's
   targeted group.
5. Given no events exist for the next 30 days, when the Schedule tab loads, then an
   empty state message is shown (not a blank screen).
6. Given an event is deleted (by coach or AI), when the Schedule tab refreshes, then
   the deleted event no longer appears.
7. Given a parent RSVPs to an event, when a coach queries availability via the AI
   ("Who's confirmed for Tuesday?"), then the fresh RSVP is reflected in the AI's
   answer.

## Out of scope
- Creating events via a form UI — events are created by the AI (F02) at launch
- Tournament bracket or results tracking — post-MVP
- Recurring event patterns ("every Tuesday") — future story
- Conflict detection across events — future story

## Technical notes
- **Data:** `events` (`id`, `team_id`, `title`, `event_type`, `start_at`, `end_at`,
  `location`, `roster_groups[]`, `notes`). `availability` (`id`, `team_id`,
  `event_id`, `athlete_id`, `status` enum `confirmed|declined|no_response`,
  `updated_at`). No new migration if `001_initial_schema.sql` covers these columns.
- **API:** No dedicated serverless function needed — Supabase JS client queries
  directly from the browser (RLS enforces isolation). Consider a thin
  `api/rsvp.js` if RSVP needs a server-side side-effect (e.g. notify coach).
- **Client:** `src/pages/SchedulePage.jsx` (or tab within `MainApp`). Hook:
  `src/hooks/useSchedule.js` — fetches events + availability for the current user's
  athletes. `AvailabilityButton` component handles optimistic state. Coach view adds
  `AttendanceSummary` component per event.
- **Env/config:** No new env vars. Supabase Realtime subscription on `availability`
  table recommended so coach's attendance view updates live.
- **Multi-tenancy:** `events.team_id` and `availability.team_id` filtered by RLS.
  Parent's query also joins `athlete_parents` to limit visible events to their
  child's groups.

## Test cases
1. **Coach sees all events** — log in as coach, open Schedule → all events for the team
   appear with correct type badges and group labels.
2. **Parent group filter** — log in as parent of Advanced athlete → only Advanced +
   All-team events visible; Tots-only event absent.
3. **RSVP going** — parent taps "Going" → button turns green, `availability` row has
   `status = 'confirmed'` when queried directly in Supabase dashboard.
4. **RSVP not going** — parent taps "Not Going" → `status = 'declined'` persisted.
5. **Coach attendance panel** — coach opens event → sees correct confirmed / declined /
   no-response counts matching `availability` rows.
6. **Empty state** — delete all events → "No upcoming events" message shown.
7. **Realtime update** — parent RSVPs in one browser tab → coach's attendance panel in
   another tab updates within 2 seconds without refresh.
8. **RLS: cross-tenant event** — with Lovett JWT, query `events` directly → zero rows
   from Riverside team.

## Dependencies
- F01 (auth + RLS) must be complete.
- F04 (athletes and roster groups) must exist to populate athlete filters.

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] Migration written + applied; RLS verified for cross-tenant isolation
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list status, PROJECT_STATE if applicable)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, supabase/migrations/001_initial_schema.sql, src/App.jsx, and
docs/backlog/stories/sprint-001.md (F03 section) for full context.

Implement F03 — Schedule & Availability:

1. Create `src/hooks/useSchedule.js`:
   - For coaches: fetch all `events` for `team_id`, ordered by `start_at`.
   - For parents: fetch events where `roster_groups` overlaps the athlete's group
     (use Postgres `&&` operator via `.filter()`).
   - Subscribe to `availability` changes via Supabase Realtime.
   - Expose `{ events, rsvp(eventId, status), loading, error }`.

2. Create/update `src/pages/SchedulePage.jsx`:
   - Render events as cards: title, date/time, location, type badge, group tags.
   - Parent view: show `AvailabilityButton` (Going / Not Going / ?) with optimistic
     state update.
   - Coach view: show `AttendanceSummary` per event (confirmed N, declined N, pending N)
     using a collapsible panel.
   - Empty state: "No upcoming events" with an illustration or simple message.

3. Create `src/components/AvailabilityButton.jsx` — handles optimistic RSVP, calls
   `useSchedule().rsvp()`, disables during in-flight request.

4. Create `src/components/AttendanceSummary.jsx` — queries availability rows for a
   given event, groups by status, lists athlete names per group.

Do not build event creation UI (handled by AI in F02). Do not build bracket/results.
```

---

# F04 · Roster Management

- **Priority:** P0
- **Status:** Planned
- **Epic:** Roster
- **Estimate:** M

## Story
As a coach,
I want all athletes, their parents, and coaching staff visible in one place with
group, weight, grade, and contact info,
so that team moms and coaches can find what they need in seconds without digging
through spreadsheets.

## Context & rationale
The roster is the team's source of truth. Skill-based groups (Beginner / Advanced are
NOT age-based) are a defining product decision — Lovett runs mixed-age skill tracks.
Parents are first-class users: when an athlete is added, their guardians receive an
invite and get their own login with a limited view (F11). Coaches have a separate
profile type with titles (Head Coach, Tots Coach, etc.) and optional group assignments.
Tap-to-call and tap-to-email on mobile make this a practical tool at tournaments.

## Acceptance criteria
1. Given athletes exist in the `athletes` table, when a coach opens the Roster tab,
   then all athletes are shown with name, weight, grade, school, roster group, and
   parent contact info (tap-to-call / tap-to-email links).
2. Given a filter is applied for "Advanced", when the list updates, then only athletes
   in the Advanced skill group are shown along with a count.
3. Given a filter is applied for "Coaches", when the list updates, then coaching staff
   are shown with titles (Head Coach, Assistant, Tots Coach, etc.) — not athletes.
4. Given a new athlete is added (via AI or form), when the Roster tab refreshes, then
   the athlete appears in the correct skill group immediately.
5. Given an athlete has two parents in `athlete_parents`, when a coach views that
   athlete's detail, then both parents' names, phone numbers, and email addresses are
   displayed with tap-to-contact links.
6. Given a parent user is logged in, when they view the Roster tab, then they can see
   basic athlete info but NOT other parents' contact details.
7. Given no athletes match the active filter, when the filter is applied, then an
   empty state message is shown (not a blank list).

## Out of scope
- Adding/editing athletes via a form UI (AI-first; form is a future convenience feature)
- TeamSnap CSV import — F13
- Photo uploads for athlete profiles — post-MVP
- Athlete edit/delete UI — handled via AI command or admin panel later

## Technical notes
- **Data:** `athletes` (`id`, `team_id`, `name`, `weight_class`, `grade`, `school`,
  `roster_group` enum `tots|beginner|advanced`). `athlete_parents` join table
  (`athlete_id`, `profile_id`). `coaches` (`id`, `team_id`, `profile_id`, `title`,
  `roster_group` nullable). `profiles` (`id`, `team_id`, `role`, `full_name`,
  `phone`, `email`).
- **API:** No serverless function needed — direct Supabase JS queries with RLS.
- **Client:** `src/pages/RosterPage.jsx`. Hook: `src/hooks/useRoster.js` — fetches
  athletes with joined parent profiles, and coaches list separately. Group filter is
  client-side (all data loaded once, filter in-memory for teams < 200 athletes).
  `AthleteCard` component. `CoachCard` component.
- **Env/config:** No new env vars.
- **Multi-tenancy:** All queries filter on `team_id` via RLS. Parent's view of roster
  is limited by a separate RLS policy that strips contact details of other families.
  `profiles` RLS: parents can read `full_name` of other profiles but NOT `phone` or
  `email` of unrelated families.

## Test cases
1. **Coach sees full roster** — log in as coach, open Roster → all athletes listed with
   weight, grade, school, group badge, and both parent contacts.
2. **Group filter: Advanced** — click Advanced filter → only Advanced athletes shown,
   count matches.
3. **Group filter: Coaches** — click Coaches filter → coaching staff shown with titles,
   no athletes in list.
4. **Filter: no results** — filter for a group with zero athletes → empty state shown.
5. **Tap-to-call** — on mobile (or dev tools mobile emulation), tap a parent phone
   number → native phone dialer opens with correct number.
6. **Parent restricted view** — log in as parent → Roster shows athlete names and groups
   but other families' phone/email is NOT displayed.
7. **New athlete appears** — add athlete via AI ("Add Jake Smith, 120 lbs, 8th grade,
   Advanced") → Roster refreshes and Jake appears in Advanced with correct details.
8. **RLS: cross-tenant query** — with Lovett JWT, query `athletes` directly → zero rows
   from Riverside.

## Dependencies
- F01 (auth + RLS + `team_id` scoping) must be complete.

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] Migration written + applied; RLS verified for cross-tenant isolation
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list status, PROJECT_STATE if applicable)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, supabase/migrations/001_initial_schema.sql, src/App.jsx, and
docs/backlog/stories/sprint-001.md (F04 section) for full context.

Implement F04 — Roster Management:

1. Create `src/hooks/useRoster.js`:
   - Fetch all `athletes` for `team_id` with joined `athlete_parents → profiles`
     (name, phone, email for each parent).
   - Fetch all `coaches` for `team_id` with joined `profiles`.
   - Expose `{ athletes, coaches, loading, error }`.

2. Create/update `src/pages/RosterPage.jsx`:
   - Group filter bar: All | Tots | Beginner | Advanced | Coaches. Show count per group.
   - Athlete list: `AthleteCard` per athlete — name, weight_class, grade, school, group
     badge, and both parent contacts (name + tap-to-call tel: link + tap-to-email
     mailto: link).
   - Coaches section (shown when Coaches filter active or in All view): `CoachCard` —
     name, title, assigned group.
   - Parent view: render AthleteCards without other families' phone/email fields.
   - Empty state per group.

3. Create `src/components/AthleteCard.jsx` and `src/components/CoachCard.jsx`.

Group colors from CLAUDE.md branding: Coaches = Gold #C4A44A, Advanced = Navy #1B3A5C,
Beginner = Columbia Blue #6BADE4, Tots = Purple #7B5EA7.

Do not build athlete add/edit forms (AI-first). Do not build CSV import (F13).
```

---

# F05 · In-App Channels + AI Q&A

- **Priority:** P1
- **Status:** Planned
- **Epic:** Communication
- **Estimate:** M

## Story
As a parent,
I want team channels where I can ask questions and get fast answers,
so that routine inquiries don't interrupt the coach during practice.

## Context & rationale
Channels are MatMind's everyday communication layer — between email broadcasts (formal,
one-way) and SMS (urgent, tournament-day). Supabase Realtime keeps messages in sync
across devices without polling. The AI Coach auto-answers genuine parent questions in
group channels (Announcements, Advanced, Beginner, Tots) by drawing from the knowledge
base and team context — it stays silent during normal conversation to avoid being
intrusive. The private "MatMind AI" channel is coach-only and handled by F02.

## Acceptance criteria
1. Given a parent sends a message in #Advanced, when the message is submitted, then it
   appears for all members of the Advanced channel within 2 seconds (Realtime sync).
2. Given a parent asks "What time does practice start Thursday?", when the AI Coach
   processes the message, then it replies with the correct time from the `events` table
   (not a generic answer).
3. Given a parent sends a casual message like "Nice work today everyone!", when the AI
   Coach evaluates the message, then it does NOT reply (only responds to genuine
   questions).
4. Given a coach posts to #Announcements, when the message appears, then it shows a
   coach badge/indicator distinguishing it from parent messages.
5. Given a user opens a channel they are not a member of (e.g. a Tots parent opens
   #Advanced), when the channel loads, then they see no messages and no input field —
   read access denied by RLS.
6. Given the AI Coach is set to "Off" in team settings, when a parent asks a question,
   then the AI does not respond in any channel.
7. Given the Supabase Realtime connection drops, when the user is in a channel, then
   a "reconnecting…" indicator is shown and messages resume on reconnect without
   duplicates.

## Out of scope
- AI Coach in the private MatMind AI channel — that is F02
- Push notifications for new messages — F06
- Threaded replies / reactions / message editing — post-MVP
- Direct messages between users — post-MVP

## Technical notes
- **Data:** `channels` (`id`, `team_id`, `name`, `group_filter` nullable,
  `ai_mode` enum `off|mentions|smart`). `messages` (`id`, `channel_id`, `team_id`,
  `sender_id`, `body`, `created_at`, `is_ai` bool). RLS on `messages`: user can read
  only channels where their `roster_group` matches `group_filter` (or `group_filter`
  is null for All-team channels).
- **API:** `api/channel-ai.js` — Vercel serverless. Called when a new message arrives
  in a non-AI channel. Evaluates `ai_mode`; if Smart, sends message to Haiku with
  question-detection prompt; if it's a question, generates a reply using team context
  and writes an AI message to `messages`. Must run async (don't block the sender's
  response).
- **Client:** `src/pages/ChannelsPage.jsx` with `ChannelList` sidebar and
  `ChannelThread` main area. Hook: `src/hooks/useChannel.js` — subscribes to
  `messages` Realtime channel filtered by `channel_id`. Optimistic message insert on
  send.
- **Env/config:** Supabase Realtime must be enabled on the `messages` table
  (publication set in Supabase dashboard). `ANTHROPIC_API_KEY` for AI replies.
- **Multi-tenancy:** `messages.team_id` scoped by RLS. `channel_id` implicitly scoped
  via `channels.team_id`. AI function reads `team_id` from JWT, never from body.

## Test cases
1. **Realtime sync** — parent sends message in #Beginner from Tab A → message appears
   in Tab B within 2 seconds without refresh.
2. **AI answers a question** — parent asks "What should wrestlers bring to Saturday's
   tournament?" → AI replies within 5 seconds with relevant answer from events/KB.
3. **AI stays quiet for non-questions** — parent sends "Great practice today!" → AI
   does not reply.
4. **Coach badge** — coach posts in #Announcements → message shows a visual coach
   indicator different from parent messages.
5. **Group access control** — Tots parent tries to view #Advanced → no messages shown,
   no send input rendered.
6. **AI mode off** — set `ai_mode = 'off'` for #Beginner → parent asks a question →
   no AI reply.
7. **Reconnection** — disconnect Wi-Fi for 5 seconds while in a channel → "reconnecting"
   indicator appears; on reconnect, any messages sent during the gap load correctly.
8. **RLS: cross-tenant channel** — with Lovett JWT, query `messages` directly → zero
   rows from Riverside channels.

## Dependencies
- F01 (auth + RLS) must be complete.
- F02 (AI + `/api/chat.js` pattern) should be complete or in parallel — shares Haiku
  call pattern.
- F04 (roster groups) needed to enforce channel group-filter access.

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] Migration written + applied; RLS verified for cross-tenant isolation
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list status, PROJECT_STATE if applicable)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, supabase/migrations/001_initial_schema.sql, src/App.jsx, and
docs/backlog/stories/sprint-001.md (F05 section) for full context. Also read
src/components/MatMindPrototype.jsx for the existing channel UI reference.

Implement F05 — In-App Channels + AI Q&A:

1. Create `src/hooks/useChannel.js`:
   - Accept `channelId`. Subscribe to `messages` Realtime filtered by `channel_id`.
   - Expose `{ messages, send(body), loading }`.
   - Optimistic insert: append message to local state immediately, then confirm on
     Realtime echo (dedupe by id).

2. Create/update `src/pages/ChannelsPage.jsx`:
   - Left sidebar: list of channels the current user can access (joined via RLS).
   - Right area: `ChannelThread` — renders message bubbles (coach badge for `role =
     'coach'`; AI badge for `is_ai = true`). Input bar at bottom.
   - If user has no access to the selected channel, show "You don't have access to
     this channel" — no messages, no input.
   - Reconnection indicator: watch Supabase Realtime status, show banner on
     CHANNEL_ERROR or TIMED_OUT, hide on re-subscribe.

3. Create `api/channel-ai.js` (Vercel serverless):
   - Triggered by a webhook from Supabase (or called directly from the client after
     sending). Check `ai_mode` for the channel. If 'off', return early.
   - Send the last message to Haiku with a question-detection prompt: "Is this a
     genuine question that needs an answer? Reply YES or NO."
   - If YES, generate a helpful reply using team context (roster + events, same pattern
     as api/chat.js). Insert the reply as a message with `is_ai = true`.
   - Do not reply to messages where `is_ai = true` (prevent loops).

Do not implement push notifications (F06), threaded replies, or DMs.
```
