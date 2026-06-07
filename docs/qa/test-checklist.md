# MatMind — QA Test Checklist

> Regression checklist run against a deployed build (default: `test.mat-mind.com`)
> before every release. 90 cases across 9 categories. IDs are stable — reference
> them in bug reports and stories.
>
> **Result key:** ✅ Pass · ❌ Fail · ⚠️ Pass-with-issue · ⏭️ Skipped · 🚫 Blocked
>
> Run as a human or via the QA agent (`cowork-qa-prompt.md`). Always test through
> the real UI (click buttons, type messages) — not by calling APIs underneath.

---

## 1. Auth & Multi-tenancy

| ID | Case | Expected |
|----|------|----------|
| AUTH-01 | Load `<slug>.mat-mind.com` (incognito) | Login screen branded with that team's name/colors/logo |
| AUTH-02 | Load an unknown subdomain | "Team not found" screen |
| AUTH-03 | Sign in with valid credentials | Lands in app scoped to the correct team |
| AUTH-04 | Sign in with wrong password | Clear error; no session created |
| AUTH-05 | "Forgot password?" → submit email | "Check your email" confirmation; wording doesn't reveal if account exists |
| AUTH-06 | Open recovery link from email | Lands on set-password screen on the correct subdomain |
| AUTH-07 | Cross-tenant isolation | Team A user cannot see Team B roster/events/messages (RLS) |
| AUTH-08 | Session persistence | Refreshing the page keeps the user signed in |
| AUTH-09 | Sign out | Returns to login; protected views inaccessible |
| AUTH-10 | Super admin visits a second subdomain | Auto-scopes to that team with admin access; no data leakage |

## 2. AI Command Center (private MatMind AI channel)

| ID | Case | Expected |
|----|------|----------|
| AI-01 | Open MatMind AI channel | Greeting reads live counts (events/confirmations); green "connected" dot |
| AI-02 | Ask "How many athletes per group?" | Accurate answer from live roster |
| AI-03 | "Add practice Thursday at 6pm for beginners" | Event created; correct title/date/time/group/location |
| AI-04 | Recurring: "every Monday in June at 6pm" | One event per date, all Mondays in June |
| AI-05 | Multi-group: "Beginner and Advanced practice Tuesday" | Event targets both groups |
| AI-06 | "Who's confirmed for the next tournament?" | Availability summary matches data |
| AI-07 | "Post our top attendance leaders to #Announcements" | Composes + posts a leaderboard to the channel |
| AI-08 | Ambiguous/garbage input | Graceful clarification, no crash, no bogus event |
| AI-09 | Network/API failure | Friendly error; typing indicator clears (no infinite spinner) |
| AI-10 | Response latency | First token / completion within a reasonable time; UI stays responsive |

## 3. Channels & Messaging

| ID | Case | Expected |
|----|------|----------|
| MSG-01 | Channel list renders | AI card + Announcements/Advanced/Beginner/Tots |
| MSG-02 | Post a message | Appears instantly for sender |
| MSG-03 | Cross-device sync | Message appears on a second device within ~1s (realtime) |
| MSG-04 | Edit own message | Inline edit; "· edited" badge after save |
| MSG-05 | Delete own message | Removed instantly on all devices |
| MSG-06 | Coach moderates others' message | Coach/admin can delete any message; parents cannot |
| MSG-07 | Attach an image | Renders inline; tap opens full size |
| MSG-08 | Attach a PDF | Renders as a download chip with name + size |
| MSG-09 | AI auto-reply (Smart mode) — real question | AI answers concisely, no filler follow-up |
| MSG-10 | AI auto-reply — casual statement | AI stays silent (no "?" → no reply) |
| MSG-11 | AI does not hijack person-directed msg | "Joey, can you …?" → AI silent |
| MSG-12 | `@MatMind …` mention | AI replies even without a question mark |
| MSG-13 | History persists | Reopen channel / refresh → history intact (no blanking) |

## 4. Schedule & Events

| ID | Case | Expected |
|----|------|----------|
| SCH-01 | Schedule tab renders | Upcoming events sorted by date with type/group badges |
| SCH-02 | Type filter (Practice/Competition) | List narrows correctly; count updates |
| SCH-03 | Group filter | Shows group events + all-group events |
| SCH-04 | Expand event | Availability summary (confirmed/declined/pending) |
| SCH-05 | Parent RSVP "Going" | Persists; reflected in coach availability summary |
| SCH-06 | Parent RSVP "Can't make it" | Persists; toggling off reverts to pending |
| SCH-07 | Coach "Take Attendance" | Mark present/absent persists; progress bar updates |
| SCH-08 | Multi-group event eligibility | Only athletes in targeted groups appear |
| SCH-09 | Empty/filtered states | Sensible "no events" messaging |
| SCH-10 | Past events excluded | Only today-forward events shown |

## 5. Roster & Contacts

| ID | Case | Expected |
|----|------|----------|
| ROS-01 | Roster renders | Members grouped; counts on filter pills |
| ROS-02 | Multi-select group filters | Toggle groups on/off; visible count matches |
| ROS-03 | Parents filter | Parents listed separately; off by default |
| ROS-04 | Expand athlete | Parent/guardian 1 & 2 contact blocks |
| ROS-05 | Tap email | Opens mail client (`mailto:`) with address |
| ROS-06 | Tap phone | Initiates call (`tel:`); formatting stripped to digits |
| ROS-07 | Coach card | Title + contact info shown; star avatar |
| ROS-08 | Add athlete (admin) | Athlete added to group; parent(s) auto-invited |
| ROS-09 | Add coach (admin) | Invite email sent; appears in roster |
| ROS-10 | Skill-based groups | Beginner/Advanced are skill tiers, not age-derived |

## 6. Knowledge Base

| ID | Case | Expected |
|----|------|----------|
| KB-01 | KB tab renders | Entries with category counts |
| KB-02 | Default install article | "How to Install MatMind" present for every team |
| KB-03 | Add via Type Content | Entry saved with chosen category |
| KB-04 | Import from URL | Fetches page text; title auto-filled; source banner |
| KB-05 | Review & trim before save | Editable title + content; save persists |
| KB-06 | Refresh from source | Re-fetches and updates an imported entry |
| KB-07 | Delete entry | Removed from list |
| KB-08 | AI uses KB | Channel/AI answer cites KB content (e.g. tournament weigh-in times) |
| KB-09 | Category filters | Filter by Tournament/Policy/FAQ/Other works |

## 7. Notifications

| ID | Case | Expected |
|----|------|----------|
| NOT-01 | "Enable Notifications" banner | Prompts permission; subscribes on grant |
| NOT-02 | Send test notification | Arrives on the subscribing device |
| NOT-03 | Channel post → push | Subscribers (not the sender) receive a push |
| NOT-04 | Per-channel mute | Muted channel produces no push |
| NOT-05 | Dynamic channel list | Notification toggles reflect current roster groups |
| NOT-06 | iOS specifics | Requires 16.4+, home-screen install; banner only when app backgrounded |
| NOT-07 | Stale subscription cleanup | 410 responses remove dead subscriptions server-side |
| NOT-08 | Sender exclusion | You don't get notified for your own posts |

## 8. Settings & Admin

| ID | Case | Expected |
|----|------|----------|
| SET-01 | Account section | Name, role badge, email, team shown |
| SET-02 | Edit team name (admin) | Persists; header updates |
| SET-03 | Edit colors (admin) | Primary/secondary apply app-wide |
| SET-04 | Logo upload (admin) | Saves; shown in header + login |
| SET-05 | Roster groups (admin) | Add/remove groups persists; Coaches not removable |
| SET-06 | AI Assistant mode (admin) | Off / Mentions / Smart toggles and persists; governs channel AI |
| SET-07 | Member management list | Coaches/parents/admins with status (active/pending) |
| SET-08 | Promote/demote role | Role pill changes role; cannot self-demote |
| SET-09 | Send password reset (admin) | Reset email sent to that member |
| SET-10 | Non-admin gating | Parents/coaches don't see admin-only sections |

## 9. PWA, Performance & Cross-Cutting

| ID | Case | Expected |
|----|------|----------|
| PWA-01 | Install to home screen | Installs; opens standalone |
| PWA-02 | Service worker update | New build activates; "Update available" banner appears |
| PWA-03 | No stale cache | Latest deploy reaches the device (skipWaiting on install) |
| PWA-04 | Pull-to-refresh | Spinner shows; data refreshes in place (no full reload) |
| PWA-05 | Mobile layout | 430px-max centered layout; no overflow/clipping |
| PWA-06 | Offline read (target) | Cached schedule/roster viewable offline |
| PWA-07 | Console clean | No uncaught errors in console during core flows |
| PWA-08 | Branding pre-auth | Team logo/colors show on login before sign-in |
| PWA-09 | Demo mode | `npm run dev` (no Supabase env) runs on mock data |
| PWA-10 | Safe-area / notch | Header respects `env(safe-area-inset-*)` on notched devices |

---

## Run log template

```
Build: <commit sha>  Env: test.mat-mind.com  Date: <date>  Tester: <human|QA agent>
Summary: <N> pass / <N> fail / <N> warn / <N> skip
Failures: <ID> — <one-line> (link to bug)
```
