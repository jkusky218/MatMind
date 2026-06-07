---
title: "[Bug] api/team.js uses VITE_ prefix env var server-side — breaks subdomain routing in production"
labels: ["bug"]
---

## Summary

`api/team.js` reads `process.env.VITE_SUPABASE_URL` on line 14. `VITE_` prefixed env vars are injected by Vite at frontend build time only and are NOT available in Vercel serverless functions at runtime. Subdomain routing (`/api/team?slug=lovett`) will return `503 Server not configured` in production.

- **Checklist ID (if any):** AUTH-01, AUTH-03
- **Severity:** 🟧 High
- **Build / commit:** 6177b63
- **Environment:** `lovett.mat-mind.com` (or any subdomain)
- **Role:** unauthenticated (pre-login)
- **Device / browser:** Any

## Steps to reproduce

1. Deploy dev branch to Vercel with `VITE_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` set (standard setup)
2. Visit `lovett.mat-mind.com`
3. `TeamContext` fetches `/api/team?slug=lovett`
4. Observe `503 Server not configured` response

## Expected

`/api/team?slug=lovett` returns `{ team_id, name, branding }` and the login screen renders with Lovett branding.

## Actual

503 error. `setNotFound(true)` fires in `TeamContext.jsx` catch block, showing "Team not found" screen instead of login.

## Evidence

`api/team.js:14`: `const supabaseUrl = process.env.VITE_SUPABASE_URL;`
`api/team.js:15`: `const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;` ← this one is correct

## Tenant-safety check

- [x] This bug does **not** expose another team's data.

## Suspected area

`api/team.js` line 14. Fix: change to `process.env.SUPABASE_URL` and add `SUPABASE_URL` as a Vercel env var (distinct from `VITE_SUPABASE_URL` which is for the frontend build).

## Notes

Simple one-line fix. High priority — this breaks the entire F01 multi-tenant feature in production.
