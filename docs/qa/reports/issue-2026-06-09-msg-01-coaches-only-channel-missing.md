## Bug report

**Checklist ID:** MSG-01
**QA report:** docs/qa/reports/report-2026-06-09.md
**Environment:** mat-mind-git-dev-jk218-projects.vercel.app
**Build:** 6314bbd
**Date found:** 2026-06-09

## Steps to reproduce
1. Open the app as a coach
2. Navigate to the Messages tab
3. Observe the channel list

## Expected behaviour
6 channels rendered: MatMind AI (Private), # Announcements, # Advanced, # Beginner, # Tots, 🔒 Coaches Only

## Actual behaviour
Only 5 channels shown — Coaches Only is entirely absent from the channel list

## Root cause
`src/lib/constants.js` CHANNELS array is missing the Coaches Only entry. `CHANNEL_NAME_TO_SLUG` is also missing `"Coaches Only": "coaches"` mapping. The DB seed (`001_initial_schema.sql`) correctly inserts the channel and `MatMindPrototype.jsx` line 120 has it, but constants.js was never updated.

**Fix:**
Add to `src/lib/constants.js` CHANNELS array:
```js
{ id: "coaches", label: "Coaches Only", desc: "Staff-only channel", icon: "lock", color: BRAND.gold, private: true },
```

Add to `CHANNEL_NAME_TO_SLUG`:
```js
"Coaches Only": "coaches",
```

## Suspected area
`src/lib/constants.js` — CHANNELS array (line ~12) and CHANNEL_NAME_TO_SLUG (line ~21)

## Severity
Medium — coaches cannot access the private staff channel through the UI; workaround is none (channel simply doesn't appear).

---
*Filed automatically by the MatMind 5AM QA agent.*
