import { useState, useEffect, useCallback } from 'react';
import { supabase, isDemo } from '../lib/supabase';

// ── Demo fallback (mirrors the Wolfpack seed + two generic examples) ──────────

const DEMO_ENTRIES = [
  {
    id: 'demo-1',
    title: 'Wolfpack Takedown Hammer',
    category: 'tournament',
    content: `Tournament: Wolfpack Takedown Hammer
Date: Sunday, February 8, 2026
Venue: North Paulding High School — Main Gym
Address: 300 North Paulding Drive, Dallas, GA 30132
Format: USAW traditional age groups. NO HIGH SCHOOL WRESTLERS.
Divisions: 6u, 8u, 10u, 12u, 14u (Boys) | K-2, 3-5, MS 6-8 (Girls, Madison weights)

Registration: $30 (closes Friday Feb 7 at 9 AM — $35 last 24 hrs)
Link: https://www.usawmembership.com/usaw_events/2600240502?section=registration

Weigh-Ins (rear of main hallway, behind entrance table):
• 6:30–7:15 AM → 6u & 8u
• 9:30–10:15 AM → 10u & Girls
• 12:30–1:15 PM → 12u & 14u

Schedule:
• Session 1: 8:00 AM → 6u & 8u
• Session 2: 11:00 AM → 10u & Girls
• Session 3: 2:00 PM → 12u & 14u

Admission: $10 family (up to 3 members) | $7 individual
Awards: Hammer Medals — top 4 at each weight class
Concessions: Available on site
Rules: No outside coolers or food. Parents & wrestlers stay on upstairs level. Max 2 coaches in corner (USA Bronze Level required).

Contact: Mike Kintz — mkintz@paulding.k12.ga.us
Assistant TD: Robbie Prince — RPrince@paulding.k12.ga.us`,
    fileName: 'Wolfpack Takedown hammer fix.pdf',
    createdAt: 'Jan 15, 2026',
  },
  {
    id: 'demo-2',
    title: 'Team Conduct & Mat Etiquette',
    category: 'policy',
    content: `All Lovett wrestlers represent the Lions — conduct reflects on the entire program.

• Show respect to opponents, coaches, and officials at all times
• No taunting or unsportsmanlike conduct — automatic removal from competition
• Wrestlers must wear proper Lovett singlet and headgear for all competitions
• Coaches have final say on weight class assignments
• Parents are NOT permitted on the mat or in the coaching area during competition
• Arrive at weigh-ins 15 minutes early
• Win or lose, shake hands and thank your opponent`,
    fileName: null,
    createdAt: 'Jan 10, 2026',
  },
  {
    id: 'demo-3',
    title: 'Parent FAQ — Tournaments',
    category: 'faq',
    content: `Q: How do I register my child for a tournament?
A: Registration links are posted in #Announcements. Most tournaments use FloWrestling or USAW Membership. Register early — spots fill fast and late fees apply.

Q: What should my child bring?
A: Singlet, headgear, wrestling shoes, water bottle, healthy snacks. No outside coolers at most venues.

Q: What are the age divisions?
A: Lovett competes in USAW age-group divisions — 6u, 8u, 10u, 12u, 14u for boys. Girls compete in Madison weight brackets.

Q: Can I coach from the stands?
A: Please leave coaching to the staff. Cheer loudly, coach never.

Q: What if we can't make it?
A: Update availability in MatMind as early as possible so Coach can plan lineups.`,
    fileName: null,
    createdAt: 'Jan 8, 2026',
  },
];

// ── Normalizer ────────────────────────────────────────────────────────────────

function normalizeEntry(row) {
  const d = new Date(row.created_at);
  const createdAt = isNaN(d.getTime())
    ? 'Recently'
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return {
    id:        row.id,
    title:     row.title,
    category:  row.category,
    content:   row.content,
    fileName:  row.file_name  ?? null,
    sourceUrl: row.source_url ?? null,
    createdAt,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useKnowledgeBase(auth) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  const teamId = auth?.profile?.team_id;

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !supabase) {
      setEntries(DEMO_ENTRIES);
      setLoading(false);
      return;
    }
    if (!teamId) {
      setLoading(false);
      return;
    }
    load();
  }, [teamId]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('knowledge_base')
      .select('id, title, category, content, file_name, source_url, created_at')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    if (error) console.error('MatMind: KB load failed', error.message);
    setEntries((data ?? []).map(normalizeEntry));
    setLoading(false);
  }

  // ── Add ───────────────────────────────────────────────────────────────────
  const addEntry = useCallback(async ({ title, category, content, fileName = null, sourceUrl = null }) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const optimistic = { id: tempId, title, category, content, fileName, sourceUrl, createdAt: 'Just now' };
    setEntries(prev => [optimistic, ...prev]);

    if (isDemo || !supabase) return { ok: true };

    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        team_id:    teamId,
        title,
        category,
        content,
        file_name:  fileName  ?? null,
        source_url: sourceUrl ?? null,
        created_by: auth?.user?.id ?? null,
      })
      .select('id, title, category, content, file_name, source_url, created_at')
      .single();

    if (error) {
      console.error('MatMind: KB insert failed', error.message);
      setEntries(prev => prev.filter(e => e.id !== tempId));
      return { ok: false, error: error.message };
    }

    // Replace temp with real row
    setEntries(prev => prev.map(e => e.id === tempId ? normalizeEntry(data) : e));
    return { ok: true };
  }, [auth, teamId]);

  // ── Update ────────────────────────────────────────────────────────────────
  const updateEntry = useCallback(async (id, { content }) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, content } : e));
    if (isDemo || !supabase) return { ok: true };
    const { error } = await supabase
      .from('knowledge_base')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      console.error('MatMind: KB update failed', error.message);
      load();
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [teamId]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteEntry = useCallback(async (id) => {
    // Optimistic remove
    setEntries(prev => prev.filter(e => e.id !== id));

    if (isDemo || !supabase) return { ok: true };

    const { error } = await supabase
      .from('knowledge_base')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('MatMind: KB delete failed', error.message);
      load(); // restore on failure
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [teamId]);

  return { entries, loading, addEntry, updateEntry, deleteEntry };
}
