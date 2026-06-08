# Facebook Funnel Automation — Project Plan

> Automate the creation and maintenance of Facebook marketing funnels using Claude (Anthropic API) and the Facebook Marketing API.
> Status: Pre-development planning. LLC formation required before Meta app approval.

---

## Objective

Build an automated pipeline that uses Claude to generate full-funnel Facebook ad campaigns (copy, targeting, structure) and deploys them directly via the Facebook Marketing API — with ongoing optimization driven by performance data fed back into Claude.

---

## Prerequisites

### Business / Legal
- [ ] LLC formed and in good standing (required for Meta Business Portfolio and app review)
- [ ] Business bank account linked to Meta ad account
- [ ] Domain with a privacy policy and terms of service page (required for Meta app review)

### Meta / Facebook Setup
- [ ] Meta Business Portfolio created at [business.facebook.com](https://business.facebook.com)
- [ ] Ad Account created inside the Business Portfolio (gets a numeric Ad Account ID)
- [ ] Meta Developer account created at [developers.facebook.com](https://developers.facebook.com)
- [ ] Meta App created (type: Business) — this is the app that gets API access
- [ ] App submitted for `ads_management` and `ads_read` permissions (requires LLC + privacy policy)
- [ ] System User created in Business Settings → granted admin access to the Ad Account
- [ ] Long-lived System User Access Token generated (does not expire)
- [ ] Facebook Pixel installed on your landing page/site

### Anthropic / Claude Setup
- [ ] Anthropic account with API access at [console.anthropic.com](https://console.anthropic.com)
- [ ] `ANTHROPIC_API_KEY` stored securely (never in client-side code)
- [ ] Model selection: Claude Haiku 4.5 for bulk generation; route complex strategy to Sonnet 4.6

---

## System Architecture

```
[Trigger: schedule / manual / webhook]
        ↓
[Claude — Strategy Layer]
  • Generate campaign structure
  • Write ad copy variants per funnel stage
  • Define audience targeting parameters
        ↓
[Campaign Builder — Node.js / Python script]
  • Translate Claude output → Facebook API payload
  • Call Marketing API to create Campaign → Ad Sets → Ads
        ↓
[Facebook Marketing API]
  • Campaign, Ad Set, Ad objects created in Ads Manager
  • Pixel tracks conversions
        ↓
[Performance Poller — runs on schedule]
  • Pulls spend, CPM, CTR, CPC, ROAS from Insights API
  • Feeds data back into Claude for optimization pass
        ↓
[Claude — Optimization Layer]
  • Kill / scale / refresh recommendations
  • Rewrites underperforming copy
  • Triggers new ad creation if creative fatigue detected
```

---

## Funnel Structure

Three-stage funnel — each stage has its own Campaign, targeting, and copy:

| Stage | Name | Audience | Objective | Budget |
|-------|------|----------|-----------|--------|
| TOFU | Awareness | Cold — Narrow Interest (see below) | Reach or Traffic | Low |
| MOFU | Consideration | Video viewers + Page engagers (retarget) | Lead Generation | Medium |
| BOFU | Conversion | Website visitors + Lead list (retarget) | Conversions / Leads | Highest |

---

## Audience Targeting Strategy — Narrow First

**Philosophy:** Start hyper-narrow, prove cost per lead, then expand. Do not use broad audiences or Advantage+ until baseline CPL is established.

### TOFU Cold Audience (Layer all criteria — AND logic)
- **Location:** Specific metro area or zip code cluster (not national)
- **Age:** Exact bracket matching your buyer persona (e.g. 28–45)
- **Interests:** 3–5 highly specific interests (avoid broad categories like "sports")
  - Use Facebook Audience Insights to find interests your persona actually follows
  - Prefer brand-specific pages (e.g. a specific publication or tool) over generic topics
- **Behaviors:** Add 1–2 purchase behaviors if applicable (e.g. "Engaged shoppers")
- **Exclude:** Current customers (Custom Audience upload), existing leads
- **Target audience size:** 50,000–200,000 (reject if > 500K — too broad)

### MOFU Retargeting
- Video viewers (25%+ of any TOFU video ad, last 30 days)
- Page / profile engagers (last 60 days)
- Instagram profile visitors if IG is connected

### BOFU Retargeting
- Website visitors via Pixel (last 14 days, all pages)
- Lead form openers who did NOT submit
- Custom Audience from email/phone list (uploaded + hashed by Meta)

### Lookalike (expand after BOFU proves out)
- 1% Lookalike of your BOFU Custom Audience
- Layer TOFU interests ON TOP of the lookalike for tighter match

---

## Phase Plan

### Phase 1 — Foundation (requires LLC)
**Goal:** Get API access and prove the pipeline works end-to-end with one manual campaign.

Steps:
1. Form LLC
2. Create Meta Business Portfolio + Ad Account
3. Build Meta Developer App; request `ads_management`, `ads_read` permissions
4. Get System User access token
5. Install Facebook Pixel on landing page
6. Write a test script that creates a single Campaign + Ad Set + Ad via the API (no Claude yet)
7. Confirm the ad appears in Ads Manager and the Pixel fires on the landing page

### Phase 2 — Claude Integration
**Goal:** Claude generates the campaign structure and copy; script deploys it.

Steps:
1. Build the Claude prompt that accepts: product description, target persona, funnel stage, and today's date → outputs structured JSON (campaign name, ad set targeting, ad copy variants)
2. Write the campaign builder that parses Claude's JSON and calls the Marketing API
3. Implement prompt caching on the system prompt (reuse persona/product context across calls)
4. Test: paste in MatMind's product description → Claude generates a 3-stage funnel → script deploys to a test ad account

### Phase 3 — Performance Loop
**Goal:** Automate optimization — no manual Ads Manager needed.

Steps:
1. Build the performance poller: calls the Insights API daily, stores results (CSV or Supabase table)
2. Feed metrics into Claude with a "what should I do?" prompt: kill ads below threshold, scale winners, rewrite flagged copy
3. Automate the recommended actions (pause ad sets, duplicate + scale, create new ad variations)
4. Set alerts: if spend exceeds daily budget cap without conversions → auto-pause + notify

### Phase 4 — Multi-Platform Expansion
**Goal:** Extend the same pipeline to Instagram and TikTok.

- Instagram: already available via the same Facebook Marketing API (Meta owns both) — minimal extra work
- TikTok: separate TikTok for Business API + separate developer account (also requires business entity)

---

## Key API Endpoints

```
POST /{ad-account-id}/campaigns          # Create campaign
POST /{ad-account-id}/adsets             # Create ad set with targeting
POST /{ad-account-id}/adcreatives        # Create creative (copy + image/video)
POST /{ad-account-id}/ads                # Create ad (links creative + ad set)
GET  /{ad-id}/insights                   # Pull performance metrics
POST /{ad-account-id}/customaudiences    # Create / update custom audience
```

Base URL: `https://graph.facebook.com/v21.0/`

---

## Environment Variables Needed

```
FB_ACCESS_TOKEN=         # Long-lived System User token (never expires)
FB_AD_ACCOUNT_ID=        # act_XXXXXXXXXXXXXXXXX
FB_APP_ID=
FB_APP_SECRET=
FB_PIXEL_ID=
ANTHROPIC_API_KEY=
```

---

## Claude Prompt Design

### Campaign Generation Prompt (Phase 2)
Input fields Claude needs per run:
- `product_name` and `product_description` (1–2 paragraphs)
- `target_persona` (demographics, pain points, goals)
- `offer` (what the ad is promoting — free trial, lead magnet, purchase)
- `funnel_stage` (TOFU | MOFU | BOFU)
- `tone` (e.g. professional, casual, urgent)
- `today_date` (for time-sensitive copy)

Output format (Claude returns JSON):
```json
{
  "campaign_name": "...",
  "objective": "LEAD_GENERATION",
  "ad_set": {
    "targeting": { ... },
    "daily_budget": 2000,
    "optimization_goal": "LEAD"
  },
  "ads": [
    {
      "name": "Variant A",
      "headline": "...",
      "primary_text": "...",
      "description": "...",
      "cta": "LEARN_MORE"
    },
    { ... }
  ]
}
```

### Optimization Prompt (Phase 3)
Input: performance data table (ad name, spend, impressions, CTR, CPL, conversions)
Output: action list — PAUSE, SCALE (multiplier), REWRITE (new copy), or KEEP

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Meta app review rejection | Submit with LLC docs, real privacy policy, clear use case description |
| Ad account disabled | Start with low spend; no policy-violating copy; use a dedicated ad account not linked to personal profile |
| API rate limits | Batch API calls; cache system user token; implement exponential backoff |
| Claude generating policy-violating copy | Add a policy-check prompt step before deployment; maintain a disallowed-phrases list |
| Runaway spend | Hard daily budget caps in the Ad Set; external spend monitor that auto-pauses if threshold crossed |

---

## Notes

- Instagram automation is included via the same Meta Marketing API — no separate app review needed once the Facebook app is approved.
- TikTok requires a separate developer account and business entity review (Phase 4).
- All API credentials must be stored server-side only. This pipeline should run as a Vercel cron job or standalone Node/Python script — never in a browser.
