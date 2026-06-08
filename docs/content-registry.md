# MatMind — Content Registry

> Maps every product feature to the downstream assets that reference it.
> This file is the source of truth for the weekly content-audit agent.
> When a feature ships or changes, add or update its row here before merging to `main`.
>
> **How to use:** When the content-audit agent runs, it reads this file, checks `git log`
> for features merged since the last audit, and drafts updates for every affected asset.

---

## Asset Index

These are all the downstream assets the content-audit agent knows about.
Each asset has a short ID used in the feature map below.

| ID | Asset | Location | Owner | Notes |
|----|-------|----------|-------|-------|
| `help-ai` | Help doc — AI Command Center | `docs/help/ai-command-center.md` | Content | Audience: coaches |
| `help-schedule` | Help doc — Schedule & Availability | `docs/help/schedule.md` | Content | Audience: coaches + parents |
| `help-roster` | Help doc — Roster Management | `docs/help/roster.md` | Content | Audience: coaches |
| `help-channels` | Help doc — Channels & Messaging | `docs/help/channels.md` | Content | Audience: all users |
| `help-notifications` | Help doc — Push Notifications | `docs/help/notifications.md` | Content | Audience: all users |
| `help-email` | Help doc — Email Broadcasts | `docs/help/email-broadcasts.md` | Content | Audience: coaches |
| `help-kb` | Help doc — Knowledge Base | `docs/help/knowledge-base.md` | Content | Audience: coaches |
| `help-support` | Help doc — Getting Support | `docs/help/support.md` | Content | Audience: all users |
| `help-branding` | Help doc — Team Branding | `docs/help/team-branding.md` | Content | Audience: admins |
| `web-features` | Website — Features page | `website/features.md` (or live URL) | Marketing | Public-facing |
| `web-home` | Website — Homepage hero/copy | `website/home.md` (or live URL) | Marketing | Public-facing |
| `web-pricing` | Website — Pricing page | `website/pricing.md` (or live URL) | Marketing | Public-facing |
| `web-onboarding` | Website — Onboarding/signup flow copy | `website/onboarding.md` | Marketing | Coach-facing |
| `fb-ad-cold` | Facebook Ad — Cold (TOFU) | `docs/marketing/ads/fb-cold.md` | Marketing | Awareness audience |
| `fb-ad-retarget` | Facebook Ad — Retargeting (MOFU/BOFU) | `docs/marketing/ads/fb-retarget.md` | Marketing | Warm audience |
| `email-welcome` | Onboarding email — Welcome (coach) | `docs/marketing/emails/welcome-coach.md` | Marketing | Sent on signup |
| `email-parent-invite` | Onboarding email — Parent invite | `docs/marketing/emails/parent-invite.md` | Marketing | Sent when parent added |
| `business-plan` | Business plan | `docs/business-plan.md` | Internal | Living document |
| `feature-list` | Feature backlog | `docs/backlog/feature-list.md` | Engineering | Dev artifact |
| `changelog` | Product changelog | `docs/changelog.md` | Engineering | Auto-updated on merge |

---

## Feature → Asset Map

For each feature, list every asset that must be reviewed when the feature ships or changes.
Rating: **R** = must rewrite · **U** = update/add section · **F** = flag for review only

### F01 · Multi-tenant Auth & Subdomain Routing
| Asset | Action | Notes |
|-------|--------|-------|
| `web-onboarding` | U | Explain subdomain setup step |
| `help-branding` | U | Subdomain is set by admin during onboarding |
| `email-welcome` | U | Include team URL (subdomain) in welcome email |
| `business-plan` | F | Verify phase status is accurate |

### F02 · AI Command Center
| Asset | Action | Notes |
|-------|--------|-------|
| `help-ai` | R | Primary help doc for this feature |
| `web-features` | U | AI command center is a headline feature — must be on features page |
| `web-home` | U | "Run your team by typing plain English" — core hero message |
| `fb-ad-cold` | U | AI command center is a primary differentiator — include in cold ad |
| `fb-ad-retarget` | U | Retargeting copy should reinforce AI ease-of-use |
| `email-welcome` | U | Point coaches to the AI channel first |
| `business-plan` | F | |

### F03 · Schedule & Availability
| Asset | Action | Notes |
|-------|--------|-------|
| `help-schedule` | R | Primary help doc |
| `web-features` | U | RSVP + attendance summary are parent-facing selling points |
| `email-parent-invite` | U | Explain how parents RSVP |
| `business-plan` | F | |

### F04 · Roster Management
| Asset | Action | Notes |
|-------|--------|-------|
| `help-roster` | R | Primary help doc |
| `web-features` | U | Tap-to-call / tap-to-email on mobile is a real pain-point for coaches at tournaments |
| `email-welcome` | U | Coach onboarding step: add your roster |
| `business-plan` | F | |

### F05 · In-App Channels + AI Q&A
| Asset | Action | Notes |
|-------|--------|-------|
| `help-channels` | R | Primary help doc |
| `web-features` | U | Parent-facing: "Ask questions, get instant answers" |
| `fb-ad-cold` | U | Parent Q&A AI is a strong parent-facing hook |
| `email-parent-invite` | U | Introduce channels in parent invite |
| `business-plan` | F | |

### F06 · Push Notifications
| Asset | Action | Notes |
|-------|--------|-------|
| `help-notifications` | R | Primary help doc |
| `web-features` | U | "Never miss an update" — per-channel notification preferences |
| `email-parent-invite` | U | Prompt parent to enable notifications |
| `business-plan` | F | |

### F07 · Email Broadcasts (SendGrid)
| Asset | Action | Notes |
|-------|--------|-------|
| `help-email` | R | Primary help doc |
| `web-features` | U | Weekly newsletter + group-targeted broadcasts |
| `fb-ad-cold` | U | Email broadcast is a TeamSnap replacement differentiator |
| `business-plan` | F | |

### F08 · Knowledge Base
| Asset | Action | Notes |
|-------|--------|-------|
| `help-kb` | R | Primary help doc |
| `web-features` | U | "AI answers from your own team policies and FAQs" |
| `help-ai` | U | Note that AI pulls from KB — link to `help-kb` |
| `business-plan` | F | |

### F09 · SMS — Tournament Day (Twilio)
| Asset | Action | Notes |
|-------|--------|-------|
| `web-features` | U | Tournament-day SMS is a strong emotional hook ("loud gym") |
| `fb-ad-cold` | U | Mention SMS for tournament day — very specific and relatable |
| `business-plan` | F | |

### F10 · Attendance Tracking & Gamification
| Asset | Action | Notes |
|-------|--------|-------|
| `help-schedule` | U | Add attendance section to schedule help doc |
| `web-features` | U | Attendance leaderboards drive athlete engagement |
| `business-plan` | F | |

### F11 · Parent-Facing Experience
| Asset | Action | Notes |
|-------|--------|-------|
| `email-parent-invite` | R | Primary asset for parents — must match actual parent experience |
| `web-features` | U | Separate parent vs. coach capabilities if featured |
| `business-plan` | F | |

### F12 · Team Branding & Logo
| Asset | Action | Notes |
|-------|--------|-------|
| `help-branding` | R | Primary help doc |
| `web-features` | U | Custom branding is a selling point vs. generic tools |
| `business-plan` | F | |

### F13 · TeamSnap Data Import
| Asset | Action | Notes |
|-------|--------|-------|
| `web-features` | U | "Switching from TeamSnap? Import in minutes." |
| `web-home` | U | TeamSnap migration story is a high-intent hook |
| `fb-ad-cold` | R | Entire cold ad angle: "Finally replace TeamSnap" |
| `help-roster` | U | Add import section |
| `email-welcome` | U | Coach onboarding: offer import as first step |
| `business-plan` | F | |

### F14 · Multi-Team Admin / League Dashboard
| Asset | Action | Notes |
|-------|--------|-------|
| `web-features` | U | League management section |
| `web-pricing` | U | Likely a higher pricing tier |
| `business-plan` | F | |

### F15 · Offline Mode & PWA Polish
| Asset | Action | Notes |
|-------|--------|-------|
| `web-features` | U | "Works in the gym, even without signal" |
| `web-home` | U | PWA / installable without app store is a selling point |
| `business-plan` | F | |

### F16 · In-App Support (MatMind Support AI)
| Asset | Action | Notes |
|-------|--------|-------|
| `help-support` | R | Primary help doc |
| `web-features` | U | Instant AI support + human escalation |
| `web-pricing` | U | Support tier may differ by plan |
| `email-welcome` | U | Point coaches to the Help button |
| `business-plan` | F | |

---

## Audit Log

Each time the weekly content-audit agent runs, it appends a row here.

| Date | Features checked | Assets flagged | Issues opened | Agent run |
|------|-----------------|----------------|---------------|-----------|
| — | — | — | — | — |
