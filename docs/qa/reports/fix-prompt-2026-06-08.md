# Claude Code Fix Prompt — 2026-06-08

> Paste this into a Claude Code session on the dev branch to resolve all open QA findings.

---

You are working on the MatMind codebase (/Users/jk/Projects/matmind). Read CLAUDE.md first for full context.

QA passed with **no failures** on 2026-06-08. No critical fixes required.

The following **warnings** should be addressed before the next release:

---

## ⚠️ W-01 — PWA icon files missing from repo

**File:** `public/` directory  
**Problem:** The PWA manifest and `vite.config.js` both reference `icon-192.png`, `icon-512.png`, and `apple-touch-icon.png`, but none of these files exist anywhere in the repository. A fresh Vercel rebuild or new deployment environment will produce 404s for all PWA icon references, breaking PWA installability.

**Evidence:** `ls public/` shows only `favicon.svg` and `attendance-mockup.html`. `git log --all -- "public/icon*"` shows no history.

**Fix required:**
1. Create or source a 512×512 PNG of the MatMind/Lovett logo in navy (#1B3A5C)
2. Add `public/icon-192.png` (192×192)
3. Add `public/icon-512.png` (512×512)
4. Add `public/apple-touch-icon.png` (180×180, referenced in vite.config.js includeAssets)
5. Commit all three files to the repo

---

## ⚠️ W-02 — Duplicate athlete in database

**Table:** `athletes`  
**Problem:** "DAK Kalish" appears twice in the Advanced group (82 lbs, 5th grade AND 85 lbs, 5th grade). This creates misleading roster counts and AI responses ("Advanced: 2 athletes (DAK Kalish × 2)").

**Fix required:**
1. Run: `SELECT * FROM athletes WHERE name ILIKE '%Kalish%';` in the Supabase dashboard
2. Determine which record is correct (or if these are genuinely two athletes with the same name)
3. Delete or rename the duplicate row
4. Verify the Roster tab and AI response reflect the corrected count

---

## ⚠️ W-03 — Build platform mismatch in QA sandbox (low priority)

**Problem:** `npm run build` fails in the Linux QA sandbox because `node_modules` was installed on macOS (darwin-arm64) and copied to Linux (linux-arm64). This only affects the QA sandbox environment — the live Vercel deployment builds correctly.

**Fix required (optional):**
- Do not copy `node_modules` between platforms
- If running local Linux builds, run `npm ci` on the Linux machine after checkout
- No code change needed

---

## No failures to fix

The 2026-06-08 QA run found zero ❌ failures across all tested categories (Auth, AI, Messaging, Schedule, Roster, Knowledge Base, Settings, PWA). The app is in a shippable state with respect to tested functionality.

New features verified working:
- SupportChat (commit 474cabc) — functional in header, opens correctly
- Email Templates (commit dccebd7) — visible in Settings
- 021 migration fix (commit f9c762a) — live DB accessible with no errors

---

After making any fixes, run:
```bash
git add -A && git commit -m "fix: resolve QA warnings from 2026-06-08"
```
on the dev branch.
