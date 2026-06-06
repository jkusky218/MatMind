# MatMind QA Test Checklist

## Test Environment
- **Preview URL**: [Vercel preview URL — update per deployment]
- **Test Coach Account**: joey.kusky@gmail.com
- **Test Parent Account**: [create a test parent account in Supabase]
- **Browser**: Chrome (latest)
- **Date**: [auto-fill]

---

## 1. Authentication

### 1.1 Coach login
- [ ] Navigate to preview URL
- [ ] Login screen renders with MatMind branding (navy gradient, columbia blue accents)
- [ ] Coach/Parent role selector works
- [ ] Enter coach credentials and sign in
- [ ] Redirects to main app with "Coach" role displayed in header
- [ ] Sign out button works and returns to login screen

### 1.2 Parent login
- [ ] Select "Parent" role
- [ ] Enter parent credentials and sign in
- [ ] Redirects to main app with "Parent" role displayed
- [ ] Parent cannot see Coaches Only channel
- [ ] Parent cannot see MatMind AI command center

### 1.3 Auth edge cases
- [ ] Invalid email shows error message
- [ ] Wrong password shows error message
- [ ] Empty fields prevented from submitting
- [ ] Session persists on page refresh
- [ ] Sign out clears session completely

---

## 2. Messages Tab — Channel List

### 2.1 Channel list rendering
- [ ] Messages tab is active by default after login
- [ ] MatMind AI card renders at top with navy gradient and "Private" badge
- [ ] Team channels section header shows "Team channels"
- [ ] All 5 channels render: Announcements, Advanced, Beginner, Tots, Coaches Only
- [ ] Each channel shows correct icon (megaphone, hash, lock)
- [ ] Last message preview shows for each channel
- [ ] Unread indicators display correctly

### 2.2 Channel navigation
- [ ] Tapping MatMind AI opens the AI command center
- [ ] Tapping any team channel opens that channel thread
- [ ] Back button returns to channel list
- [ ] Header and tab bar hide when inside a channel thread
- [ ] Header and tab bar reappear when returning to channel list

---

## 3. MatMind AI (Command Center)

### 3.1 AI chat basics
- [ ] Opening message renders with team snapshot
- [ ] "Try asking" quick action buttons display
- [ ] Tapping a quick action populates the input field
- [ ] Typing a message and hitting Enter sends it
- [ ] Send button enables/disables based on input content
- [ ] User messages appear right-aligned in navy bubbles
- [ ] AI responses appear left-aligned with brain icon
- [ ] Typing indicator (bouncing dots) shows while AI processes

### 3.2 AI response quality
- [ ] "What's this week?" returns upcoming events
- [ ] "Who's confirmed for [event]?" returns availability breakdown
- [ ] "How many athletes?" returns roster count by group
- [ ] "[Name] is sick, pull from Saturday" updates availability and confirms actions
- [ ] "Add practice Wednesday 5pm" creates an event
- [ ] "Send a reminder to beginner parents" drafts a message with recipient count
- [ ] AI understands group names: Tots, Beginner, Advanced, Coaches

### 3.3 AI action verification
- [ ] When AI marks an athlete unavailable, availability data actually updates
- [ ] When AI adds an event, it appears in the Schedule tab
- [ ] Action items display with checkmark icons
- [ ] Follow-up suggestions render in a highlighted box

---

## 4. Team Channels

### 4.1 Channel thread rendering
- [ ] Channel header shows channel name, icon, and description
- [ ] Private channels show lock icon and "Private" badge
- [ ] Existing messages render in correct order
- [ ] Coach messages show sender name with "Coach" label
- [ ] Parent messages show sender name
- [ ] AI messages show MatMind AI branding
- [ ] Pinned messages show pin indicator
- [ ] Timestamps display on messages

### 4.2 Posting messages
- [ ] Text input field renders at bottom of channel
- [ ] Placeholder text matches channel name
- [ ] Typing and sending a message adds it to the thread
- [ ] New messages auto-scroll into view
- [ ] Message appears immediately (optimistic update)

### 4.3 Channel-specific checks
- [ ] Announcements: coach can post, all members can read
- [ ] Advanced: shows only advanced group content
- [ ] Beginner: shows only beginner group content, AI auto-responds to parent questions
- [ ] Tots: shows only tots group content
- [ ] Coaches Only: only visible to coaches, not parents

---

## 5. Schedule Tab

### 5.1 Schedule rendering
- [ ] Schedule tab shows event count
- [ ] Events render in chronological order
- [ ] Each event shows: date block, type badge, group badge, title, time, location
- [ ] Event type badges: Practice (green), Tournament (gold), Match (blue)
- [ ] Group badges display with correct colors (Advanced=navy, Beginner=columbia, Tots=purple)
- [ ] "All" group events show no group badge

### 5.2 Event expansion
- [ ] Tapping an event expands to show availability
- [ ] Availability shows confirmed/declined/pending counts
- [ ] Progress bar renders correctly (navy for confirmed, red for declined)
- [ ] Tapping again collapses the event
- [ ] Only one event expanded at a time

### 5.3 Schedule data integrity
- [ ] Events added via AI chat appear in schedule
- [ ] Availability changes from AI chat reflect in schedule
- [ ] Event dates and times display correctly
- [ ] Location information is accurate

---

## 6. Roster Tab

### 6.1 Roster rendering
- [ ] Roster tab shows total member count
- [ ] Filter pills render: All, Coaches, Advanced, Beginner, Tots
- [ ] Each filter shows correct count in parentheses
- [ ] Default view shows all members sorted by group then weight

### 6.2 Roster filtering
- [ ] Tapping "Coaches" filters to coaching staff only
- [ ] Tapping "Advanced" filters to advanced wrestlers only
- [ ] Tapping "Beginner" filters to beginner wrestlers only
- [ ] Tapping "Tots" filters to tots wrestlers only
- [ ] Tapping "All" resets the filter
- [ ] Active filter pill is highlighted with group color

### 6.3 Athlete cards
- [ ] Each athlete shows: avatar (initials or star for coaches), name, weight, grade, group badge
- [ ] Coaches show role instead of weight/grade
- [ ] Coach avatars show gold star icon
- [ ] Group badges show correct color
- [ ] Athletes sorted by weight within their group

### 6.4 Expanded athlete details
- [ ] Tapping an athlete expands their card
- [ ] School name displays with school icon
- [ ] Parent/Guardian 1 shows name, email, phone
- [ ] Parent/Guardian 2 shows name, email, phone (if on file)
- [ ] Missing second parent shows "No second parent/guardian on file"
- [ ] Coach cards show contact info without parent labels
- [ ] Tapping again collapses the card

---

## 7. Responsive / Mobile

### 7.1 Mobile viewport
- [ ] App constrains to 430px max-width
- [ ] All text is readable at mobile size
- [ ] Touch targets are at least 44px
- [ ] Scrolling works smoothly in all tabs
- [ ] Chat input doesn't get hidden behind keyboard
- [ ] No horizontal scrolling occurs

### 7.2 PWA functionality
- [ ] App loads on mobile browser
- [ ] "Add to Home Screen" prompt appears (or manual add works)
- [ ] Installed app opens in standalone mode (no browser chrome)
- [ ] App icon and splash screen show MatMind branding
- [ ] App works offline for cached content (if implemented)

---

## 8. Visual / Branding

### 8.1 Lovett School colors
- [ ] Header uses navy gradient (#0F2440 → #1B3A5C)
- [ ] Interactive elements use columbia blue (#6BADE4)
- [ ] Coach/tournament elements use gold (#C4A44A)
- [ ] Group colors consistent: Coaches=gold, Advanced=navy, Beginner=columbia, Tots=purple
- [ ] No off-brand colors appear anywhere

### 8.2 Typography and spacing
- [ ] Inter font loads correctly
- [ ] Text hierarchy is clear (headers, body, captions)
- [ ] Adequate spacing between elements
- [ ] No text overflow or truncation issues

---

## 9. Data Integrity

### 9.1 Supabase connection
- [ ] App connects to Supabase (not running in demo mode)
- [ ] Login uses real Supabase auth
- [ ] Roster data loads from database
- [ ] Events data loads from database
- [ ] Availability data loads from database
- [ ] Channel messages load from database

### 9.2 Real-time updates
- [ ] New messages appear without page refresh (if Realtime enabled)
- [ ] Availability changes reflect across tabs

---

## Test Report Template

### Summary
- **Date**: 
- **Build**: [commit hash]
- **Preview URL**: 
- **Tester**: Cowork QA Agent
- **Total tests**: 
- **Passed**: 
- **Failed**: 
- **Blocked**: 

### Failed Tests
| # | Test Case | Expected | Actual | Severity |
|---|-----------|----------|--------|----------|
|   |           |          |        |          |

### Notes

