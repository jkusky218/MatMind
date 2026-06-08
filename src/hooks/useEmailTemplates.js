import { useState, useEffect, useCallback } from 'react';
import { supabase, isDemo } from '../lib/supabase';

// ── Default built-in template (shown when no saved templates exist) ───────────
export const DEFAULT_TEMPLATE = {
  id:       '__default__',
  name:     'Standard Weekly Update',
  tone:     'friendly',
  sections: [
    {
      id:              'greeting',
      type:            'greeting',
      title:           'Opening Greeting',
      description:     'Warm welcome to families',
      guidance:        'Use the team name and a friendly tone. Keep it to 2 sentences.',
      is_required:     true,
      auto_populate:   false,
      default_content: '',
    },
    {
      id:              'this_week_schedule',
      type:            'this_week_schedule',
      title:           'This Week\'s Schedule',
      description:     'Upcoming practices, matches, and events',
      guidance:        'List all events this week with date, time, and location. Bold the dates.',
      is_required:     true,
      auto_populate:   true,
      default_content: '',
    },
    {
      id:              'reminders',
      type:            'reminders',
      title:           'Reminders',
      description:     'Action items for families',
      guidance:        'Use bullet points. Keep to 3-4 items max. Include RSVP deadlines.',
      is_required:     false,
      auto_populate:   false,
      default_content: '',
    },
    {
      id:              'closing',
      type:            'custom',
      title:           'Closing',
      description:     'Sign-off from coaching staff',
      guidance:        'End with the team motto/mascot. Sign off from coaching staff.',
      is_required:     true,
      auto_populate:   false,
      default_content: '',
    },
  ],
  is_default:   true,
  last_used_at: null,
};

export const SECTION_TYPE_LIBRARY = [
  { type: 'greeting',            label: 'Opening Greeting',       icon: '👋', auto_populate: false, description: 'Warm welcome to families' },
  { type: 'this_week_schedule',  label: 'This Week\'s Schedule',  icon: '📅', auto_populate: true,  description: 'Pulls from the schedule automatically' },
  { type: 'tournament_update',   label: 'Tournament Update',      icon: '🏆', auto_populate: true,  description: 'Upcoming tournament details' },
  { type: 'practice_notes',      label: 'Practice Notes',         icon: '💪', auto_populate: false, description: 'Notes from recent practices' },
  { type: 'shoutouts',           label: 'Athlete Shoutouts',      icon: '⭐', auto_populate: false, description: 'Recognize standout athletes' },
  { type: 'reminders',           label: 'Reminders',              icon: '🔔', auto_populate: false, description: 'Action items for families' },
  { type: 'action_items',        label: 'Action Items',           icon: '✅', auto_populate: false, description: 'Things families need to do' },
  { type: 'dues_update',         label: 'Dues / Fees Update',     icon: '💰', auto_populate: false, description: 'Payment reminders and deadlines' },
  { type: 'custom',              label: 'Custom Section',         icon: '✏️', auto_populate: false, description: 'Anything else' },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useEmailTemplates(auth) {
  const [templates, setTemplates] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState(null);

  const teamId = auth?.profile?.team_id;

  // Load all templates for this team
  useEffect(() => {
    if (isDemo || !supabase || !teamId) {
      setTemplates([DEFAULT_TEMPLATE]);
      setLoading(false);
      return;
    }
    supabase
      .from('email_templates')
      .select('*')
      .eq('team_id', teamId)
      .order('is_default', { ascending: false })
      .order('last_used_at', { ascending: false, nullsFirst: false })
      .then(({ data, error: err }) => {
        if (err) setError(err.message);
        setTemplates(data?.length ? data : [DEFAULT_TEMPLATE]);
        setLoading(false);
      });
  }, [teamId]);

  // Get the default template (or first one)
  const defaultTemplate = templates.find(t => t.is_default) ?? templates[0] ?? DEFAULT_TEMPLATE;

  // Save a new template
  const saveTemplate = useCallback(async (templateData) => {
    setSaving(true);
    setError(null);

    if (isDemo || !supabase) {
      const newT = { ...templateData, id: `demo-${Date.now()}`, team_id: teamId, created_at: new Date().toISOString() };
      setTemplates(prev => [newT, ...prev.filter(t => t.id !== '__default__')]);
      setSaving(false);
      return { ok: true, template: newT };
    }

    // If this is being set as default, unset others first
    if (templateData.is_default) {
      await supabase.from('email_templates').update({ is_default: false }).eq('team_id', teamId);
    }

    const payload = {
      team_id:       teamId,
      created_by:    auth?.user?.id,
      name:          templateData.name,
      tone:          templateData.tone,
      sections:      templateData.sections,
      example_email: templateData.example_email ?? null,
      is_default:    templateData.is_default ?? false,
    };

    const { data, error: err } = await supabase
      .from('email_templates')
      .insert(payload)
      .select()
      .single();

    if (err) { setError(err.message); setSaving(false); return { ok: false, error: err.message }; }

    setTemplates(prev => [data, ...prev.filter(t => t.id !== '__default__')]);
    setSaving(false);
    return { ok: true, template: data };
  }, [auth, teamId]);

  // Update an existing template
  const updateTemplate = useCallback(async (id, updates) => {
    setSaving(true);
    if (isDemo || !supabase) {
      setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      setSaving(false);
      return { ok: true };
    }
    const { error: err } = await supabase
      .from('email_templates')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('team_id', teamId);
    if (err) { setError(err.message); setSaving(false); return { ok: false, error: err.message }; }
    setTemplates(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    setSaving(false);
    return { ok: true };
  }, [teamId]);

  // Delete a template
  const deleteTemplate = useCallback(async (id) => {
    if (isDemo || !supabase) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      return { ok: true };
    }
    const { error: err } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)
      .eq('team_id', teamId);
    if (err) return { ok: false, error: err.message };
    setTemplates(prev => prev.filter(t => t.id !== id));
    return { ok: true };
  }, [teamId]);

  // Mark a template as used (update last_used_at)
  const markUsed = useCallback(async (id) => {
    if (id === '__default__' || isDemo || !supabase) return;
    await supabase
      .from('email_templates')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', id);
  }, []);

  return { templates, defaultTemplate, loading, saving, error, saveTemplate, updateTemplate, deleteTemplate, markUsed };
}
