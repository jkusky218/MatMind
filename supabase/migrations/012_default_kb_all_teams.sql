-- Migration 012: Seed default KB entries for all teams
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Inserts the "How to Install MatMind" guide for every existing team that
--    doesn't already have it (idempotent — safe to run multiple times).
-- 2. Creates a trigger so every future team automatically gets the same
--    default articles on creation.

-- ── Default article content ───────────────────────────────────────────────────

DO $do$
DECLARE
  v_title   TEXT := 'How to Install MatMind & Enable Notifications';
  v_content TEXT := $content$
# How to Install MatMind & Enable Notifications

MatMind works best when installed directly on your phone's home screen — it runs like a native app (full screen, fast, offline-capable) and can send you push notifications for practice changes, tournament reminders, and team updates.

---

## iPhone / iPad (iOS)

**Step 1 — Open in Safari**
MatMind must be installed through Safari. If you're using Chrome or another browser on iPhone, copy the link and paste it into Safari instead.

**Step 2 — Tap the Share button**
At the bottom of the Safari screen, tap the Share icon (a box with an arrow pointing upward).

**Step 3 — Tap "Add to Home Screen"**
Scroll down in the share sheet and tap "Add to Home Screen." Give it a name (MatMind is fine) and tap "Add" in the top right.

**Step 4 — Open from your Home Screen**
You'll now see the MatMind icon on your home screen. Always open it from there — not from Safari — to get the full app experience.

**Step 5 — Enable Notifications**
The first time you open the app from your home screen, you'll see a blue notification banner in the Messages tab. Tap "Enable Notifications" and then tap "Allow" when iOS asks for permission.

> **Note:** Push notifications on iPhone require iOS 16.4 or later and the app must be opened from the home screen icon (not Safari directly).

---

## Android

**Step 1 — Open in Chrome**
Navigate to the MatMind link in Chrome on your Android device.

**Step 2 — Install the app**
Tap the three-dot menu (⋮) in the top right corner. Tap "Add to Home screen" or "Install app" (the wording varies by Android version). Tap "Add" or "Install" to confirm.

**Step 3 — Open from your Home Screen**
Tap the MatMind icon on your home screen to launch the installed app.

**Step 4 — Enable Notifications**
Open the app, go to the Messages tab, and tap "Enable Notifications" in the blue banner. Android will show a permission prompt — tap "Allow."

---

## Troubleshooting

**I don't see the notification banner.**
If you already tapped "Not now" once, the banner won't reappear automatically. Go to your phone's Settings → MatMind → Notifications and turn them on from there.

**Notifications stopped working.**
Try removing the app from your home screen and reinstalling it using the steps above. If the issue continues, contact your coach.

**I'm on iPhone and it says notifications aren't supported.**
Make sure you're on iOS 16.4 or later (Settings → General → About → iOS Version). Also confirm you opened the app from the home screen icon, not from Safari.
$content$;

BEGIN
  -- 1. Back-fill all existing teams that don't yet have this article
  INSERT INTO public.knowledge_base (team_id, title, category, content)
  SELECT t.id, v_title, 'faq', v_content
  FROM   public.teams t
  WHERE  NOT EXISTS (
    SELECT 1
    FROM   public.knowledge_base kb
    WHERE  kb.team_id = t.id
      AND  kb.title   = v_title
  );
END;
$do$;

-- ── Trigger: auto-seed default KB entries for every new team ──────────────────

CREATE OR REPLACE FUNCTION public.seed_default_kb_for_team()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.knowledge_base (team_id, title, category, content)
  VALUES (
    NEW.id,
    'How to Install MatMind & Enable Notifications',
    'faq',
    $content$
# How to Install MatMind & Enable Notifications

MatMind works best when installed directly on your phone's home screen — it runs like a native app (full screen, fast, offline-capable) and can send you push notifications for practice changes, tournament reminders, and team updates.

---

## iPhone / iPad (iOS)

**Step 1 — Open in Safari**
MatMind must be installed through Safari. If you're using Chrome or another browser on iPhone, copy the link and paste it into Safari instead.

**Step 2 — Tap the Share button**
At the bottom of the Safari screen, tap the Share icon (a box with an arrow pointing upward).

**Step 3 — Tap "Add to Home Screen"**
Scroll down in the share sheet and tap "Add to Home Screen." Give it a name (MatMind is fine) and tap "Add" in the top right.

**Step 4 — Open from your Home Screen**
You'll now see the MatMind icon on your home screen. Always open it from there — not from Safari — to get the full app experience.

**Step 5 — Enable Notifications**
The first time you open the app from your home screen, you'll see a blue notification banner in the Messages tab. Tap "Enable Notifications" and then tap "Allow" when iOS asks for permission.

> **Note:** Push notifications on iPhone require iOS 16.4 or later and the app must be opened from the home screen icon (not Safari directly).

---

## Android

**Step 1 — Open in Chrome**
Navigate to the MatMind link in Chrome on your Android device.

**Step 2 — Install the app**
Tap the three-dot menu (⋮) in the top right corner. Tap "Add to Home screen" or "Install app" (the wording varies by Android version). Tap "Add" or "Install" to confirm.

**Step 3 — Open from your Home Screen**
Tap the MatMind icon on your home screen to launch the installed app.

**Step 4 — Enable Notifications**
Open the app, go to the Messages tab, and tap "Enable Notifications" in the blue banner. Android will show a permission prompt — tap "Allow."

---

## Troubleshooting

**I don't see the notification banner.**
If you already tapped "Not now" once, the banner won't reappear automatically. Go to your phone's Settings → MatMind → Notifications and turn them on from there.

**Notifications stopped working.**
Try removing the app from your home screen and reinstalling it using the steps above. If the issue continues, contact your coach.

**I'm on iPhone and it says notifications aren't supported.**
Make sure you're on iOS 16.4 or later (Settings → General → About → iOS Version). Also confirm you opened the app from the home screen icon, not from Safari.
$content$
  );
  RETURN NEW;
END;
$$;

-- Drop and recreate so this migration is idempotent
DROP TRIGGER IF EXISTS on_team_created_seed_kb ON public.teams;

CREATE TRIGGER on_team_created_seed_kb
  AFTER INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.seed_default_kb_for_team();
