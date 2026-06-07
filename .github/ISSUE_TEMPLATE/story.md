---
name: User Story
about: A build-ready user story for a MatMind feature
title: "[Story] <FID> · <short title>"
labels: ["story"]
assignees: []
---

<!--
  One story = one shippable slice of value. Keep acceptance criteria
  runtime-observable so the QA agent can verify them by driving the app.
  Reference the backlog: docs/backlog/feature-list.md
-->

## Story

**As a** <coach | parent | admin | program director>,
**I want** <capability>,
**so that** <outcome>.

- **Feature ID:** <e.g. F07>
- **Priority:** P0 | P1 | P2 | P3
- **Epic:** <Auth | AI | Communication | Schedule | Roster | KB | Admin | PWA>
- **Estimate:** XS | S | M | L | XL

## Context & rationale

<2–4 sentences tying this to the MatMind vision (conversational-first, multi-tenant,
skill-based groups) and current architecture.>

## Acceptance criteria

<!-- Numbered, testable, Given/When/Then. Cover happy path AND edge cases. -->

1. Given … when … then …
2. …
3. …

## Out of scope

- …

## Technical notes

- **Data:** tables/columns; new migration? RLS implications.
- **API:** `/api/*` function(s); Claude tool defs if AI-related.
- **Client:** hooks/components (e.g. `useTeamData`, `ChannelThread`, `SettingsPage`).
- **Env/config:** new env vars; Supabase dashboard; Vercel domains.
- **Multi-tenancy:** how `team_id` + RLS keep tenants isolated.

## Test cases

<!-- Map to docs/qa/test-checklist.md categories. Include ≥1 negative/abuse case. -->

- [ ] <ID/desc> → expected …
- [ ] <ID/desc> → expected …

## Dependencies

- Blocked by: #
- Blocks: #

## Definition of Done

- [ ] Acceptance criteria met and demoed in a real browser
- [ ] Migration written + applied; cross-tenant isolation verified
- [ ] QA checklist items pass
- [ ] Docs updated (feature-list status, PROJECT_STATE if applicable)
- [ ] PR merged; deployed to production
