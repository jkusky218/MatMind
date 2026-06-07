---
name: Bug Report
about: Something in MatMind doesn't work as expected
title: "[Bug] <short summary>"
labels: ["bug"]
assignees: []
---

<!--
  Bugs found by the QA agent should reference the checklist ID
  (docs/qa/test-checklist.md), e.g. MSG-04, AUTH-07.
-->

## Summary

<One sentence: what's broken.>

- **Checklist ID (if any):** <e.g. SCH-05>
- **Severity:** 🟥 Critical (data leak / blocks core flow) · 🟧 High · 🟨 Medium · 🟦 Low
- **Build / commit:** <sha or version>
- **Environment:** test.mat-mind.com | lovetths.mat-mind.com | local demo | other
- **Role:** coach | parent | admin | super-admin
- **Device / browser:** <e.g. iPhone 15 / iOS 17 PWA, desktop Chrome>

## Steps to reproduce

1. …
2. …
3. …

## Expected

<What should happen.>

## Actual

<What actually happened.>

## Evidence

<!-- Screenshot, screen recording, console error, or response body. Required. -->

## Tenant-safety check

- [ ] This bug does **not** expose another team's data.
      <If it might (cross-tenant read/write), mark Severity = Critical and flag immediately.>

## Suspected area (optional)

<Hook / serverless function / migration, e.g. `useTeamData` loadData, `/api/notify`,
migration 015 `edited_at`.>

## Notes

<Frequency (always/intermittent), recent related changes, workarounds.>
