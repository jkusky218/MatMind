# QA Agent — Setup Instructions

How to stand up the automated QA agent that runs `test-checklist.md` against a
deployed MatMind build and writes reports to `docs/qa/reports/`.

---

## 1. Prerequisites

- **A deployed build to test.** Default target: `https://test.mat-mind.com` (the
  sandbox team). QA never runs against a real team without explicit approval.
- **A test account** on the target team with the role you want to exercise. For
  full coverage you need an **admin/super-admin** login (admin-only sections) and,
  ideally, a **parent** login (parent-facing gating).
- **A browser the agent can drive** — one of:
  - **Claude-in-Chrome** (the agent controls your logged-in Chrome), or
  - **Puppeteer/Playwright** driving system Chrome headless (good for screenshots
    saved to disk).
- **Two devices/sessions** if you want to verify realtime cross-device sync
  (MSG-03) and push delivery (NOT-03) — e.g. desktop + phone, or two browser
  profiles.

## 2. Local vs. deployed

| Mode | Command | Notes |
|------|---------|-------|
| **Demo (local)** | `npm run dev` | No Supabase env → runs on mock data (`src/lib/mockData.js`). Good for UI smoke tests; **admin/AI/realtime are not exercised** (no backend). |
| **Deployed (real)** | visit `test.mat-mind.com` | Full stack: Supabase, Claude, realtime, push. **Use this for regression QA.** |

The app is mobile-first (max-width 430px). When driving a desktop browser, set a
mobile viewport (e.g. 390×844) so layout matches production.

## 3. One-time browser setup

1. Sign in to the target subdomain in the browser the agent will drive.
2. Confirm you're on the **intended team** (check the header / team name).
3. **Force the latest build** before testing — service workers cache aggressively.
   In DevTools console or via the agent:
   ```js
   // Unregister SW + clear caches, then reload to fetch the live build
   for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
   for (const k of await caches.keys()) await caches.delete(k);
   location.reload();
   ```
   (Symptoms of a stale build: Settings missing recently-shipped sections, channel
   AI not responding. Record as **PWA-03** if seen.)

## 4. Running the QA agent

1. Open a Cowork session with browser access.
2. Paste [`cowork-qa-prompt.md`](./cowork-qa-prompt.md).
3. Tell it the target env and which logins are available, e.g.:
   > "Run the full regression on `test.mat-mind.com`. I'm signed in as an admin.
   > A second phone is available for cross-device checks. Do **not** send invites,
   > SMS, or email broadcasts."
4. The agent walks the 90 cases, captures evidence, and writes
   `docs/qa/reports/YYYY-MM-DD-<sha>.md`.
5. For each ❌, it files a bug using `.github/ISSUE_TEMPLATE/bug.md`.

## 5. Scope guardrails (important)

These actions reach real people — the agent must get **explicit per-run approval**:
- Sending **invites** (add coach/athlete creates real invite emails)
- **Password reset** emails
- **Email broadcasts** (SendGrid) and **SMS** (Twilio)

Safe-by-default on the test team: posting test messages, creating/editing/deleting
test events and messages, toggling settings, KB URL import (then discard).

## 6. Environment variables (for reference)

QA doesn't set these (they live in Vercel), but failures often trace back to them:

| Var | Powers |
|-----|--------|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | client data + auth |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api/admin`, `/api/notify`, `/api/team` (server only) |
| `VITE_ROOT_DOMAIN` | subdomain → team resolution (must be `mat-mind.com`) |
| `ANTHROPIC_API_KEY` | `/api/chat` (Claude Haiku) |
| `VITE_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | Web Push |
| `SENDGRID_API_KEY` | email broadcasts (when built) |
| `TWILIO_*` | SMS (when built) |

Also verify in the **Supabase dashboard**: redirect URLs include
`https://*.mat-mind.com/**`; `messages` is in the `supabase_realtime` publication;
the `channel-files` storage bucket exists.

## 7. Cadence

- Run the **full checklist** before every release / production deploy.
- Run an **affected-area subset** on each story merge.
- Keep reports in `docs/qa/reports/` so trends (flaky areas, recurring fails) are
  visible over time.
