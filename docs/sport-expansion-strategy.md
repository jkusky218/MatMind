# MatMind Sport Expansion Strategy

> **Horizon: 2027.** Nail wrestling first. This document plans how we scale the same
> platform to additional youth sports without forking the codebase or rebuilding from scratch.

---

## Vision

MatMind is not a wrestling app. It is an **AI-powered team management platform** that
happens to launch in wrestling because that's where the founder has deep domain expertise.
The AI-first, conversational architecture is sport-agnostic by nature — "Marcus is sick,
pull him from Saturday" works for any sport. What changes across sports is the
**domain vocabulary, stat model, and a handful of sport-specific workflows**.

The goal is a single codebase that ships a wrestling-native experience today and can be
configured to feel equally native for lacrosse, basketball, volleyball, or swimming in
2027 — without the wrestling codebase diverging into a separate product.

---

## Domain Strategy

Each sport gets its own domain. This is a branding and SEO decision, not a technical one
— the same Vercel deployment serves all of them via subdomain or custom domain routing.

### Option A — Sport subdomains under matmind.app (Recommended for launch)
```
wrestling.matmind.app   → Lovett Wrestling (current)
lacrosse.matmind.app
basketball.matmind.app
```
**Pros:** single SSL cert, single Vercel project, easy routing via `Host` header.
**Cons:** "matmind" brand must be strong enough to carry the sport.

### Option B — Separate vanity domains per sport (Phase 6+)
```
matmind.app/wrestling   → wrestling hub
wrestlingmind.app       → custom domain alias (CNAME → matmind.app)
lacrossemind.app
```
**Pros:** SEO isolation, sport-specific brand identity, easier to sell/license independently.
**Cons:** SSL per domain, more DNS management, complicates multi-sport user accounts.

### Recommendation
Launch Option A. Register vanity domains now (they're cheap) and point them at
`matmind.app` as aliases. If a sport community wants its own brand identity, flip the
CNAME — no code change required.

---

## Code Architecture

### The Core Principle: Sport Config, Not Sport Forks

Every sport-specific difference is expressed as **configuration and optional modules**,
not as branching code paths. The platform core is never touched when adding a new sport.

```
matmind/
├── src/
│   ├── core/                   # Sport-agnostic — never modified per sport
│   │   ├── auth/
│   │   ├── roster/             # athletes, coaches, parents, groups
│   │   ├── schedule/           # events, RSVP, availability
│   │   ├── channels/           # messaging, AI assistant
│   │   ├── support/            # MatMind Support AI + KB
│   │   └── admin/              # CEO dashboard, tenants, ops
│   │
│   ├── sports/                 # Sport modules — loaded by config
│   │   ├── wrestling/
│   │   │   ├── config.js       # Sport manifest (see below)
│   │   │   ├── WeightClass.jsx
│   │   │   ├── LineupCard.jsx
│   │   │   ├── DualMeetScore.jsx
│   │   │   ├── WeighIn.jsx
│   │   │   └── TournamentBracket.jsx
│   │   ├── lacrosse/
│   │   │   ├── config.js
│   │   │   ├── RosterPositions.jsx
│   │   │   └── GameSheet.jsx
│   │   └── basketball/
│   │       ├── config.js
│   │       └── LineupRotation.jsx
│   │
│   └── platform/               # Bootstraps the right sport module
│       └── SportProvider.jsx   # Reads team.sport, loads config
```

### The Sport Config Object

Each sport ships a `config.js` that the platform reads at boot. This is the contract
between the sport module and the core platform.

```js
// src/sports/wrestling/config.js
export default {
  sport:        'wrestling',
  label:        'Wrestling',
  mascotDefault: '🤼',
  colors: {
    primary:   '#1B3A5C',
    secondary: '#6BADE4',
    accent:    '#C4A44A',
  },

  // Roster — what fields athletes have beyond the core set
  athleteFields: [
    { key: 'weight_class', label: 'Weight class', type: 'select',
      options: [106,113,120,126,132,138,144,150,157,165,175,190,215,285] },
    { key: 'weigh_in_weight', label: 'Weigh-in weight', type: 'number' },
    { key: 'wins', label: 'Wins', type: 'number' },
    { key: 'losses', label: 'Losses', type: 'number' },
  ],

  // Groups — skill/age tiers for this sport
  defaultGroups: ['Tots', 'Beginner', 'Advanced'],
  groupBasis:    'skill',   // 'skill' | 'age' | 'position'

  // Events — what event types exist
  eventTypes: ['practice', 'dual_meet', 'tournament', 'scrimmage', 'weigh_in'],

  // AI — sport-specific context injected into the team AI system prompt
  aiContext: `This is a youth wrestling team. Key concepts:
- Weight classes determine who competes against whom (106–285 lbs)
- Dual meets are team competitions scored by weight class wins
- Tournaments are individual bracket competitions
- Groups are SKILL-based (Tots, Beginner, Advanced) not age-based`,

  // Sport-specific dashboard tabs (added alongside core Schedule/Roster/KB tabs)
  dashboardTabs: [
    { key: 'lineup',   label: 'Lineup',   component: 'LineupCard' },
    { key: 'dual',     label: 'Dual Meet', component: 'DualMeetScore' },
  ],

  // AI commands this sport understands (extends core command set)
  aiCommands: [
    'set_weight_class', 'build_lineup', 'record_result', 'weigh_in_check',
  ],
};
```

```js
// src/sports/lacrosse/config.js
export default {
  sport:         'lacrosse',
  label:         'Lacrosse',
  athleteFields: [
    { key: 'position', label: 'Position', type: 'select',
      options: ['Attack','Midfield','Defense','Goalie','LSM'] },
    { key: 'jersey_number', label: 'Jersey #', type: 'number' },
  ],
  defaultGroups: ['JV', 'Varsity'],
  groupBasis:    'age',
  eventTypes:    ['practice', 'game', 'tournament', 'scrimmage'],
  aiContext:     `This is a youth lacrosse team...`,
  dashboardTabs: [
    { key: 'roster_positions', label: 'Positions', component: 'RosterPositions' },
  ],
  aiCommands:    ['set_position', 'build_game_lineup'],
};
```

The core platform never imports `wrestling/` or `lacrosse/` directly — it imports from
`platform/SportProvider` which resolves the right module at runtime based on
`team.sport`.

---

## Database Strategy

### What stays shared (no changes)
All core tables are sport-agnostic and work for any sport today:
`teams`, `profiles`, `athletes`, `coaches`, `athlete_parents`, `events`,
`availability`, `channels`, `messages`, `support_tickets`, `support_kb`

### Sport-specific extension pattern

**Option 1 — JSONB `metadata` column (Recommended)**
Add `metadata JSONB DEFAULT '{}'` to `athletes` and `events`. Each sport writes its
fields into metadata. No migrations needed when adding a new sport.

```sql
-- wrestling athlete metadata
{ "weight_class": 138, "weigh_in_weight": 136.4, "wins": 12, "losses": 3 }

-- lacrosse athlete metadata
{ "position": "Midfield", "jersey_number": 22 }
```

**Option 2 — Sport-specific extension tables**
For sports with complex structured data (brackets, game stats), add a dedicated table:
```sql
wrestling_dual_meets   (team_id, event_id, lineup JSONB, score JSONB)
wrestling_tournament_results (athlete_id, tournament_id, placement, record)
```

Use Option 1 for simple field extensions. Use Option 2 only when the data has its own
relational structure that needs querying (e.g., tournament bracket logic).

### Multi-sport teams
Some organizations coach multiple sports (e.g., a middle school with wrestling AND
basketball). The `teams` table already supports this — each team has one `sport` value.
A user with access to two teams sees both in a team-switcher. No schema changes needed.

---

## AI Strategy Per Sport

The team AI system prompt is the primary customization point. The `aiContext` field in
each sport's config is injected into the prompt alongside roster and schedule data.

**Wrestling prompt additions:**
- Weight class vocabulary ("pull Marcus from 138")
- Dual meet scoring (6 pts pin, 4 pts major decision, 3 pts decision, 2 pts OT)
- Lineup building ("give me a full lineup for Saturday")

**Lacrosse prompt additions:**
- Position vocabulary ("move Tyler to attack")
- Game vs practice distinction
- Substitution rotation patterns

**What stays common:**
- Availability management ("Jordan can't make Thursday")
- Parent communication drafting
- Event creation and scheduling
- RSVP tracking

The AI abstraction means a coach in any sport gets the same natural-language interface —
the system prompt makes it fluent in their sport's vocabulary.

---

## Go-to-Market by Sport

### Sequencing rationale
Don't expand until MatMind is the obvious choice for wrestling coaches. One sport done
extremely well is the foundation. The playbook proven in wrestling — conversational AI,
hybrid interface, no-app-store PWA — transfers to every other sport.

| Year | Sport | Why |
|------|-------|-----|
| 2025–2026 | Wrestling | Founder domain expertise; tight community; weight class complexity proves the platform |
| Q1 2027 | Lacrosse | Fast-growing youth sport; similar team structure; strong parent engagement |
| Q2 2027 | Volleyball | Large participation base; club + school overlap; roster complexity |
| Q3 2027 | Basketball | Biggest market; most competition (also most noise to cut through with AI-first story) |
| 2028+ | Swimming, Soccer, Baseball | Evaluate based on inbound demand and community fit |

### Expansion trigger (before adding any sport)
- 10+ wrestling teams paying on MatMind
- NPS > 50 from wrestling coaches
- Core platform stable (no open P1/P2 bugs for 60 days)
- Sport config architecture implemented and validated with a second internal test sport

---

## What to Build Now (While Wrestling-Only)

The most valuable investment during the wrestling phase is **building the architecture
correctly so sport expansion is config, not code**. Specific actions:

1. **Add `sport` column to `teams` table** (migration) — defaults to `'wrestling'`
2. **Add `metadata JSONB` to `athletes`** — start writing weight class data there instead
   of a dedicated column
3. **Extract `src/sports/wrestling/config.js`** — formalize what is currently implicit
   wrestling knowledge scattered across components
4. **Create `SportProvider` context** — wraps the app, exposes `useSport()` hook that
   returns the active config
5. **Audit AI system prompt** — pull wrestling-specific language into `config.aiContext`
   so it's explicit and replaceable

None of this is visible to users. All of it makes the 2027 expansion a sprint, not a
re-architecture.

---

## What This Is NOT

- **Not a white-label product** — MatMind is a brand, not infrastructure sold to
  third parties to rebrand. Each sport is a MatMind product, not a licensable SDK.
- **Not a sport-specific fork** — one repo, one deployment, one database schema. If
  fixing a bug in the messaging system requires touching `src/sports/wrestling/`, the
  architecture is wrong.
- **Not premature** — nothing in this document should be built in 2025 except the
  foundation items listed above. The goal is to avoid painting ourselves into a corner,
  not to over-engineer for a future that may not arrive on schedule.
