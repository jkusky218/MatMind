# Cowork QA Agent — Setup Instructions

## Overview

This guide walks you through setting up an automated QA testing agent in Claude Cowork that tests MatMind after every code push. The agent runs independently of Claude Code, preserving your Code session limits for development only.

---

## Step 1: Create the Cowork project

1. Open **Claude Cowork** (claude.ai → Cowork)
2. Click **New Project**
3. Name it: `MatMind QA Agent`
4. Add the MatMind project folder as a source (~/Projects/matmind)

## Step 2: Add the QA prompt

1. In the Cowork project, open the task/prompt editor
2. Copy the entire contents of `docs/qa/cowork-qa-prompt.md` and paste it as the project prompt
3. This gives the agent full context on what to test and how to report

## Step 3: Add reference files

Make sure the Cowork project can access these files from your MatMind repo:
- `CLAUDE.md` — project context
- `docs/qa/test-checklist.md` — detailed test cases
- `docs/qa/cowork-qa-prompt.md` — the agent prompt
- `supabase/migrations/001_initial_schema.sql` — database schema

## Step 4: Configure the schedule

Set up the Cowork project to run on a schedule:

### Option A: After every push (recommended for active development)
- Trigger: When you push to the `dev` branch
- How: After pushing code in Claude Code, open Cowork and run the QA agent manually
- Best for: Active sprint development when you're making daily changes

### Option B: Nightly (recommended for stable periods)
- Trigger: Daily at a set time (e.g., 8:00 AM)
- How: Set a daily recurring task in Cowork
- Best for: Maintenance mode when changes are less frequent

### Option C: On-demand (recommended for bug fix cycles)
- Trigger: You manually kick it off
- How: Open the Cowork project and say "Run the full regression test"
- Best for: After a batch of bug fixes, before merging to main

## Step 5: Review the output

After each run, the agent produces a test report. Review it for:
1. **Critical failures** — these block deployment, fix immediately
2. **Failed tests** — log as GitHub Issues with the details from the report
3. **Warnings** — address before next release but not blockers
4. **Passed tests** — confirm coverage is adequate

## Step 6: Feed bugs back to Claude Code

For each failed test, create a GitHub Issue:

```markdown
## Bug: [Test name that failed]

**Source**: QA Agent test report — [date]
**Severity**: [Critical/High/Medium/Low]

### Expected behavior
[From the test report]

### Actual behavior
[From the test report]

### File reference
[From the test report]

### Steps to reproduce
1. [step]
2. [step]
3. [step]
```

Then in Claude Code, paste the issue and say:
> "Fix this bug: [paste GitHub Issue]. Push to dev when fixed."

After the fix, re-run the Cowork QA agent to verify.

---

## The full cycle

```
You plan features (Chat)
    ↓
Cowork generates stories + dev prompts
    ↓
Claude Code implements (1 story = 1 session)
    ↓
Push to dev branch → Vercel preview deploys
    ↓
Cowork QA Agent runs regression tests
    ↓
You review the test report
    ↓
Pass? → PR to main → Vercel deploys to prod
Fail? → GitHub Issues → Claude Code fixes → Cowork retests
```

---

## Tips

- **Keep the test checklist updated**: When you add a new feature, add test cases to `docs/qa/test-checklist.md`. The Cowork agent reads this file every run.
- **Don't skip human review**: The agent catches regressions. You catch "this doesn't feel right." Both matter.
- **Batch bug fixes**: If the report shows 5 bugs, fix them all in one Code session if they're small. Then retest once.
- **Track test history**: Save each test report in `docs/qa/reports/` with the date. This gives you a quality trend over time.
