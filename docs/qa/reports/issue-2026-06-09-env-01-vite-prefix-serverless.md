## Bug report

**Checklist ID:** ENV-01 (Phase 1 code review)
**QA report:** docs/qa/reports/report-2026-06-09.md
**Environment:** mat-mind-git-dev-jk218-projects.vercel.app
**Build:** 6314bbd
**Date found:** 2026-06-09

## Steps to reproduce
1. Review api/ serverless functions
2. Search for `process.env.VITE_SUPABASE_URL` usage

## Expected behaviour
Server-side functions use `process.env.SUPABASE_URL` (with optional `|| VITE_SUPABASE_URL` fallback as in `api/chat.js`)

## Actual behaviour
Five serverless functions use ONLY `process.env.VITE_SUPABASE_URL` with no fallback:
- `api/admin.js:8`
- `api/support.js:98`
- `api/notify.js:15` (also `VITE_VAPID_PUBLIC_KEY` at line 10)
- `api/send-email.js:15`
- `api/team.js:11`

If Vercel project env vars are configured with canonical names (`SUPABASE_URL`, `VAPID_PUBLIC_KEY`), all five endpoints fail silently to connect to Supabase.

## Fix
Change each `process.env.VITE_SUPABASE_URL` to `process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL` (matching the pattern already used in `api/chat.js` and `api/ops.js`). Change `VITE_VAPID_PUBLIC_KEY` to `process.env.VAPID_PUBLIC_KEY || process.env.VITE_VAPID_PUBLIC_KEY`.

## Suspected area
`api/admin.js`, `api/support.js`, `api/notify.js`, `api/send-email.js`, `api/team.js`

## Severity
Medium — functions work today if Vercel env vars are named with VITE_ prefix, but this is fragile and will silently break if env vars are ever renamed to canonical form.

---
*Filed automatically by the MatMind 5AM QA agent.*
