You are working on the MatMind codebase (/Users/jk/Projects/matmind). Read CLAUDE.md first for full context.

Fix the following bugs and high-priority warnings found in the QA report from 2026-06-07. Make all changes on the dev branch.

---

## Bug 1 — HIGH (AUTH-01, AUTH-03)
**Server-side env var uses wrong prefix in `api/team.js`**

File: `api/team.js`, line 14
Current: `const supabaseUrl = process.env.VITE_SUPABASE_URL;`
Fix: Change to `const supabaseUrl = process.env.SUPABASE_URL;`

The `VITE_` prefix is injected by Vite at frontend build time only. Vercel serverless functions don't have access to it at runtime, so subdomain routing returns 503 for every team. Also add a note in ONBOARDING.md that `SUPABASE_URL` (without VITE_ prefix) must be set as a separate Vercel environment variable for the `api/` functions.

---

## Bug 2 — HIGH (PWA-01, PWA-08)
**PWA icons missing from `public/`**

Files needed: `public/icon-192.png`, `public/icon-512.png`

The PWA manifest (in `vite.config.js`) references both files but only `public/favicon.svg` exists. Generate the two PNG icons from the favicon or any suitable source image:

```bash
npm install -g sharp-cli
sharp -i public/favicon.svg -o public/icon-192.png resize 192 192
sharp -i public/favicon.svg -o public/icon-512.png resize 512 512
```

If sharp-cli doesn't work with the SVG, use the vite-plugin-pwa asset generator or create simple placeholder PNGs with the correct dimensions as a stopgap. The maskable icon can share the same file as the standard 512px icon for now.

---

## High warnings to address alongside bugs

**Warning A — `TeamContext.jsx`: Network errors show "Team not found"**
File: `src/lib/TeamContext.jsx`
In the `useEffect` fetch block, the `.catch()` currently calls `setNotFound(true)`. Add a separate `networkError` state and show a distinct "Can't reach the server — try again" message so users aren't confused when it's a connectivity issue rather than a bad URL.

**Warning B — `useAuth.js`: Cross-tenant check runs after session is created**
File: `src/hooks/useAuth.js`, lines 74–83
The profile `team_id` validation happens after `signInWithPassword` succeeds. If the profile fetch fails (network blip), the user could land in the app unauthenticated or with wrong team. Wrap the profile fetch in a try/catch and call `supabase.auth.signOut()` in the catch block before returning the error, so no partial session is left open.

---

After making all fixes, confirm the build is clean and commit:

```bash
npm run build
git add -A
git commit -m "fix: resolve QA failures from 2026-06-07 (env var prefix, PWA icons, network error UX)"
```
