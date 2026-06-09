# Claude Code Fix Prompt — 2026-06-09

You are working on the MatMind codebase (/Users/jk/Projects/matmind). Read CLAUDE.md first for full context.

---

## Failures to fix

### ❌ MSG-01 — "Coaches Only" channel missing from constants.js

**File:** `src/lib/constants.js`

**Problem:** The CHANNELS array (line ~12) and CHANNEL_NAME_TO_SLUG map (line ~21) are both missing the "Coaches Only" channel entry. The DB seed and MatMindPrototype.jsx both have it — constants.js was never updated. The channel never renders in the UI.

**Fix:**

In the `CHANNELS` array, add this entry after the "tots" entry:
```js
{ id: "coaches", label: "Coaches Only", desc: "Staff-only channel", icon: "lock", color: BRAND.gold, private: true },
```

In `CHANNEL_NAME_TO_SLUG`, add:
```js
"Coaches Only": "coaches",
```

---

### ❌ ENV-01 — Serverless API functions use `VITE_SUPABASE_URL` without fallback

**Files:** `api/admin.js:8`, `api/support.js:98`, `api/notify.js:15`, `api/send-email.js:15`, `api/team.js:11`

**Problem:** These five files use `process.env.VITE_SUPABASE_URL` as the only env var for the Supabase URL. If Vercel is ever configured with the canonical `SUPABASE_URL` variable name, all five break silently. `api/chat.js` and `api/ops.js` already use the correct fallback pattern.

**Fix for each file — change:**
```js
const url = process.env.VITE_SUPABASE_URL;
```
**To:**
```js
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
```

Also in `api/notify.js:10`, change:
```js
process.env.VITE_VAPID_PUBLIC_KEY,
```
**To:**
```js
process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY,
```

---

## 🟧 High warnings to address alongside the bugs

### WARN-02 — Duplicate athlete "DAK Kalish" in roster

The roster shows "DAK Kalish" at both 82 lbs and 85 lbs, both in the Advanced group. Check the Supabase `athletes` table for this team and remove the duplicate row. No code change needed — this is a data cleanup.

### WARN-04 — `api/notify.js` VITE_VAPID_PUBLIC_KEY server-side

Covered by the ENV-01 fix above (`VAPID_PUBLIC_KEY || VITE_VAPID_PUBLIC_KEY`).

---

After making all fixes, run `npm run build` to confirm the build is clean, then run:

```bash
git add -A && git commit -m "fix: resolve QA failures from 2026-06-09" && git push origin dev
```
