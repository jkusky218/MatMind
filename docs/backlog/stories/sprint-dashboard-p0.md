# Sprint Dashboard P0 — CEO Operations Dashboard Foundation

> Build-ready stories for D01 (Admin Auth) and D02 (Dashboard Shell + Overview).
> Both stories are completable in one Claude Code session each.
> Full dashboard spec: `docs/ceo-dashboard-features.md`

---

# D01 · Admin Auth & Route Guard

- **Priority:** P0
- **Status:** Planned
- **Epic:** Admin
- **Estimate:** S

## Story
As a MatMind operator,
I want a protected `/admin` route that only super admins can access,
so that tenant data and operational controls are never exposed to coaches or parents.

## Context & rationale
The CEO dashboard shares the same Supabase project as the team app. The `super_admin`
role must be enforced at two layers: client-side (route guard prevents rendering) and
server-side (every `api/admin/*` function verifies the role from the JWT before
returning data). A compromised client cannot bypass the server check. The `super_admin`
value is set only via the Supabase dashboard or a one-time seed script — there is no
public API to self-promote.

## Acceptance criteria
1. Given a user with `role = 'super_admin'` in their JWT, when they navigate to `/admin`,
   then the dashboard shell renders successfully.
2. Given a user with `role = 'coach'` or `role = 'parent'`, when they navigate to
   `/admin`, then they are immediately redirected to `/` with no flash of admin content.
3. Given an unauthenticated user, when they navigate to `/admin`, then they are
   redirected to the login page.
4. Given a valid coach JWT (not super_admin), when a direct `POST /api/admin/tenants`
   request is made, then the function returns HTTP 403 and no data is returned.
5. Given a `super_admin` JWT, when `POST /api/admin/tenants` is called, then it returns
   the tenant list successfully.
6. Given the `super_admin` role is set in Supabase dashboard on a profile, when that
   user logs in, then their JWT contains `role = 'super_admin'` as a custom claim.

## Out of scope
- Admin login page (uses the same Supabase Auth login as the main app — role determines destination after auth)
- Admin user management UI (super_admin is set via Supabase dashboard only at launch)
- Audit logging of admin actions (D10)
- Any dashboard content beyond the auth guard itself

## Technical notes
- **Data:** Add `super_admin` to the `profiles.role` enum via migration. Add a Supabase
  Auth hook (or `profiles` trigger) that copies `role` into the JWT as a custom claim on
  sign-in. Without the custom claim, the server cannot verify role from the JWT alone.
- **API:** Create `src/lib/adminAuth.js` — a server-side helper that all `api/admin/*`
  functions call first: reads JWT from `Authorization: Bearer <token>` header, verifies
  with `supabase.auth.getUser()`, checks `profile.role === 'super_admin'`, returns 403
  if not. Single source of truth for all admin auth checks.
- **Client:** `src/admin/AdminGuard.jsx` — reads role from auth context; redirects
  non-super-admins. Wrap the entire `src/admin/` tree with this guard in `src/App.jsx`
  using `React.lazy()` + `<Suspense>`. Admin bundle must be code-split: verify with
  `npm run build` that no admin chunk appears in the main entry point.
- **Env/config:** No new env vars. Uses existing `SUPABASE_SERVICE_ROLE_KEY` server-side.
- **Multi-tenancy:** Admin functions read across all `team_id` values. RLS must have
  explicit `super_admin` bypass policies: `USING (auth.jwt() ->> 'role' = 'super_admin')`
  on every table the admin API touches.
- **Migration needed:** Yes — add `super_admin` to role enum and create RLS bypass
  policies.

## Test cases
1. **Happy path** — set `role = 'super_admin'` on your profile in Supabase dashboard →
   log in → navigate to `/admin` → dashboard shell renders.
2. **Coach blocked (client)** — log in as a coach → navigate to `/admin` → redirected
   to `/` immediately; no admin UI visible even for a millisecond.
3. **Parent blocked (client)** — same as above for a parent account.
4. **Unauthenticated redirect** — clear session → navigate to `/admin` → redirected to
   login page.
5. **Server-side 403** — with a valid coach JWT, call `GET /api/admin/tenants` directly
   via curl or Postman → response is `{ error: 'Forbidden' }`, HTTP 403.
6. **Code split verified** — run `npm run build`; inspect `dist/` chunks; confirm no
   file named `admin` appears in the main `index.html` script tags.
7. **JWT claim present** — after super_admin login, decode the JWT (jwt.io) and confirm
   `role: "super_admin"` is in the payload.
8. **RLS bypass** — with super_admin JWT, query `athletes` via Supabase JS client →
   returns athletes from ALL teams, not just one.

## Dependencies
- `001_initial_schema.sql` applied (profiles table with role enum exists).
- Supabase Auth custom claims hook capability (available on all Supabase plans via
  `auth.users` trigger or Auth hook in dashboard).

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] Migration written + applied; RLS bypass policies verified for super_admin
- [ ] Admin bundle is code-split (verified via build output)
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list D01 status → ✅)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, supabase/migrations/001_initial_schema.sql, src/hooks/useAuth.js,
src/App.jsx, and docs/backlog/stories/sprint-dashboard-p0.md (D01 section).

Implement D01 — Admin Auth & Route Guard:

1. Write migration `supabase/migrations/006_admin_role.sql`:
   - Add 'super_admin' to the profiles.role enum.
   - Add a Postgres function + trigger on auth.users sign-in (or use Supabase Auth
     hook config) that sets the JWT custom claim `role` from the profiles table.
   - Add RLS policies on athletes, events, messages, channels, availability,
     ai_conversations, support_tickets, support_messages tables:
     USING (auth.jwt() ->> 'role' = 'super_admin') — these bypass team_id scoping.

2. Create `src/lib/adminAuth.js` (used by all api/admin/* serverless functions):
   - Export `requireSuperAdmin(req, res)` — reads Bearer token, calls
     supabase.auth.getUser(), checks role from profiles table (do not trust client
     body). Returns { userId, teamId } on success. Calls res.status(403).json(...)
     and returns null on failure. All api/admin/* handlers call this first.

3. Create `src/admin/AdminGuard.jsx`:
   - Reads role from the auth context (useAuth hook).
   - If loading: show a blank screen (no flash).
   - If unauthenticated: redirect to '/login'.
   - If authenticated but role !== 'super_admin': redirect to '/'.
   - If super_admin: render children.

4. Update `src/App.jsx`:
   - Add a lazy-loaded route for '/admin/*':
     const AdminApp = React.lazy(() => import('./admin/AdminApp'));
   - Wrap it in <Suspense> and <AdminGuard>.
   - Create a stub `src/admin/AdminApp.jsx` that renders "Admin dashboard coming soon"
     — just enough to verify code splitting and routing work.

5. Verify code split: run `npm run build` and confirm no admin chunk is referenced
   in the main entry HTML.

Do NOT build any dashboard UI — that is D02.
```

---

# D02 · Dashboard Shell & Overview Page

- **Priority:** P0
- **Status:** Planned
- **Epic:** Admin
- **Estimate:** M

## Story
As a MatMind operator,
I want a sidebar-nav dashboard shell with an overview page showing summary cards,
so that I can navigate all operational sections and see the platform's health at a glance.

## Context & rationale
The shell is the permanent scaffold every subsequent dashboard feature (D03–D10) slots
into. Getting the navigation, layout, and overview card pattern right now means each
future section is a simple route addition with a card slot on the overview page.
The overview page shows one summary metric per section — a "mission control" view
that tells the operator whether anything needs immediate attention before they drill in.
Cards that carry a warning or error state link directly to the problem.

## Acceptance criteria
1. Given a super_admin navigates to `/admin`, when the page loads, then a two-column
   layout renders: a fixed left sidebar with section links and a main content area
   showing the Overview page.
2. Given the sidebar, when the operator clicks "Tenants", then the route changes to
   `/admin/tenants` and the sidebar item is visually active.
3. Given the Overview page, when it loads, then it shows at least 6 summary cards:
   System Health, Tenants, Usage, Support, Dev/Deploy, and a Marketing placeholder.
4. Given a summary card for System Health, when the last health check shows
   `status = 'down'`, then the card displays a red indicator; when `status = 'ok'`
   it displays green.
5. Given the Tenants card, when teams exist in the database, then the card shows the
   correct total team count pulled from Supabase (not hardcoded).
6. Given the Support card, when open tickets exist, then the card shows the correct
   open ticket count; when count > 0 the card shows an amber indicator.
7. Given a summary card, when the operator clicks it, then they navigate to that
   section's full route (e.g. `/admin/support`).
8. Given zero admin code in the main app bundle, when `npm run build` runs, then the
   admin chunk is referenced only from the lazy-loaded split point — not from the
   main `index.html` entry scripts.

## Out of scope
- Full section content for Health, Tenants, Support, etc. — those are D03–D10
- Mobile-responsive layout for the admin dashboard (desktop-only at launch)
- Dark/light mode toggle for admin (uses a fixed dark theme matching Lovett Navy)
- Role-based sidebar (all sections always visible to super_admin)

## Technical notes
- **Data:** Overview page queries two lightweight endpoints on load:
  - `GET /api/admin/overview` — returns `{ tenantCount, openTickets, lastHealthStatus,
    lastDeployAt, aiCallsToday }`. Single serverless function, single round-trip.
  - No realtime subscription on the overview page — manual refresh is fine.
- **API:** Create `api/admin/overview.js` — calls `requireSuperAdmin`, queries:
  `SELECT COUNT(*) FROM teams` (tenant count), `SELECT COUNT(*) FROM support_tickets
  WHERE status = 'open'` (ticket count), latest row from `system_health_log`
  (health status), and `SELECT COUNT(*) FROM ai_call_log WHERE created_at > now() - interval '1 day'`
  (AI calls today). Returns all as a single JSON object.
- **Client:** `src/admin/AdminApp.jsx` — renders the shell. Use a simple CSS Grid or
  flexbox layout: 220px fixed sidebar + flex-1 main area. No external UI library
  required — use inline styles consistent with the main app's brand tokens (Navy
  `#1B3A5C`, Columbia Blue `#6BADE4`, Gold `#C4A44A`). `src/admin/pages/OverviewPage.jsx`
  renders the summary cards. `src/admin/components/SummaryCard.jsx` — reusable card
  with: title, metric value, status indicator (green/amber/red), and onClick nav.
- **Routing:** Use `react-router-dom` nested routes under `/admin`. Each section is a
  stub route returning "Coming soon" until its feature story is built.
- **Env/config:** No new env vars beyond what D01 established.
- **Multi-tenancy:** `api/admin/overview.js` queries without `team_id` filter (cross-
  tenant by design). Protected by `requireSuperAdmin` from D01.

## Test cases
1. **Shell renders** — log in as super_admin → navigate to `/admin` → sidebar and
   overview page visible; no console errors.
2. **Sidebar navigation** — click each sidebar link → URL changes to correct sub-route;
   active link is visually highlighted; content area shows the correct page (or stub).
3. **Tenant count accurate** — create a new team via Supabase dashboard → refresh
   overview → Tenants card count increments by 1.
4. **Health card green** — insert a row in `system_health_log` with `status = 'ok'` →
   Health card shows green indicator.
5. **Health card red** — insert a row with `status = 'down'` → Health card shows red
   indicator and links to `/admin/health`.
6. **Support card amber** — insert an open support ticket → Support card count > 0,
   amber indicator shown.
7. **Card click navigates** — click the Support card → route changes to `/admin/support`.
8. **Code split** — `npm run build` → `dist/` does NOT include admin JS in the main
   entry chunk (`index.html` references only the main bundle, not any `admin-*.js`
   file directly).
9. **Non-admin blocked** — log in as coach → navigate to `/admin` → redirected to `/`;
   Overview page never renders.

## Dependencies
- D01 (admin auth + route guard + `requireSuperAdmin` helper) must be complete.
- `support_tickets` table must exist (from F16 migration) for the open ticket count.
  If F16 is not yet deployed, `api/admin/overview.js` should handle a missing table
  gracefully (return `openTickets: 0`).
- `system_health_log` table must exist — created in the same migration as D03, but
  `api/admin/overview.js` must handle its absence gracefully at D02 time.

## Definition of Done
- [ ] Acceptance criteria met and demoed in a real browser (not just unit tests)
- [ ] `npm run build` confirms admin code is fully code-split
- [ ] Overview page shows live data (not hardcoded) for tenant count and ticket count
- [ ] All sidebar routes render without crashing (stubs acceptable for D03+ sections)
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list D02 status → ✅)
- [ ] Committed with a descriptive message; PR opened

## Claude Code dev prompt
```
Read CLAUDE.md, src/App.jsx, src/hooks/useAuth.js, src/admin/AdminGuard.jsx
(created in D01), and docs/backlog/stories/sprint-dashboard-p0.md (D02 section).

Implement D02 — Dashboard Shell & Overview Page:

1. Create `api/admin/overview.js` (Vercel serverless):
   - Call requireSuperAdmin(req, res) from src/lib/adminAuth.js. Return 403 if not super_admin.
   - Query Supabase with service-role key:
     a. SELECT COUNT(*) FROM teams → tenantCount
     b. SELECT COUNT(*) FROM support_tickets WHERE status = 'open' → openTickets
        (handle table-not-found gracefully: catch error, return 0)
     c. SELECT status, latency_ms FROM system_health_log ORDER BY checked_at DESC LIMIT 1
        → lastHealth (handle missing table: return { status: 'unknown' })
     d. SELECT COUNT(*) FROM ai_call_log WHERE created_at > now() - interval '1 day'
        → aiCallsToday (handle missing table: return 0)
   - Return { tenantCount, openTickets, lastHealth, aiCallsToday }.

2. Create `src/admin/AdminApp.jsx`:
   - Shell layout: fixed 220px sidebar (Navy #0F2440 bg) + flex-1 main area (Navy #1B3A5C bg).
   - Sidebar items: Overview, Health, Tenants, Analytics, Support, Dev, Marketing, Finance.
     Each is a react-router NavLink. Active item: Columbia Blue left border + slightly
     lighter background.
   - MatMind logo + "Ops Dashboard" label at top of sidebar.
   - Use nested <Routes> for sub-paths. Each non-Overview route renders a stub:
     <div style={{color:'#fff',padding:32}}>Section coming soon.</div>
   - The default route (/admin) renders <OverviewPage />.

3. Create `src/admin/pages/OverviewPage.jsx`:
   - On mount, fetch /api/admin/overview (with Authorization: Bearer <token> header
     — read token from supabase.auth.getSession()).
   - Render 6 SummaryCards in a CSS grid (3 columns, 2 rows):
     a. System Health — value: lastHealth.status, indicator: green/amber/red, link: /admin/health
     b. Tenants — value: tenantCount + " teams", indicator: always green, link: /admin/tenants
     c. AI Usage — value: aiCallsToday + " calls today", indicator: green, link: /admin/analytics
     d. Support — value: openTickets + " open tickets", indicator: openTickets > 0 ? amber : green, link: /admin/support
     e. Development — value: "View deploys", indicator: green, link: /admin/dev
     f. Marketing — value: "Coming soon", indicator: grey, link: /admin/marketing
   - Show a loading skeleton while fetching. Show an error state if fetch fails.

4. Create `src/admin/components/SummaryCard.jsx`:
   - Props: title, value, indicator ('green'|'amber'|'red'|'grey'), href, loading.
   - Style: dark card (Navy Dark #0F2440), colored left border by indicator,
     title in small caps Columbia Blue, value in large white text, click navigates to href.

5. Update src/App.jsx to replace the AdminApp stub from D01 with the real AdminApp.

Brand tokens for admin UI — use these exact values, do not introduce new colors:
  Navy Dark:     #0F2440 (sidebar background)
  Navy:          #1B3A5C (main content background)
  Columbia Blue: #6BADE4 (active nav, card titles)
  Gold:          #C4A44A (warnings, amber indicators)
  White:         #FFFFFF (primary text)
  Red indicator: #E05252
  Green indicator: #52C97C

Do NOT build out any full section pages (Health, Tenants, etc.) — those are D03+.
```
