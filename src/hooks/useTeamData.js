import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isDemo } from '../lib/supabase';
import { CHANNEL_NAME_TO_SLUG } from '../lib/constants';
import {
  INITIAL_ROSTER,
  INITIAL_EVENTS,
  INITIAL_AVAILABILITY,
  INITIAL_CHANNEL_MESSAGES,
} from '../lib/mockData';

// ── Normalizers ──────────────────────────────────────────────────────────────

function normalizeAthlete(a) {
  const parents = [...(a.athlete_parents || [])].sort((x, y) => y.is_primary - x.is_primary);
  const p1 = parents[0]?.profiles;
  const p2 = parents[1]?.profiles;
  return {
    id: a.id,
    name: `${a.first_name} ${a.last_name}`,
    weight: a.weight != null ? String(Math.round(a.weight)) : null,
    grade: a.grade,
    school: a.school,
    group: a.roster_group,
    role: null,
    parent1: p1 ? { name: p1.full_name, email: p1.email, phone: p1.phone } : null,
    parent2: p2 ? { name: p2.full_name, email: p2.email, phone: p2.phone } : null,
  };
}

function normalizeCoach(c) {
  const p = c.profiles;
  return {
    id: c.id,
    name: p?.full_name ?? 'Coach',
    weight: null,
    grade: null,
    school: null,
    group: 'coaches',
    role: c.title ?? 'Coach',
    parent1: p ? { name: p.full_name, email: p.email, phone: p.phone } : null,
    parent2: null,
  };
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':');
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}

function normalizeEvent(e) {
  return {
    id: e.id,
    title: e.title,
    type: e.event_type,
    date: e.event_date,
    time: formatTime(e.start_time),
    location: e.location_name ?? '',
    group: e.roster_group ?? 'all',
  };
}

function normalizeMessage(m) {
  const d = new Date(m.created_at);
  const time = d.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
  return {
    id: m.id,
    sender: m.sender_name,
    role: m.is_ai ? 'ai' : m.sender_role,
    text: m.content,
    time,
    pinned: m.is_pinned ?? false,
  };
}

// ── Hook ─────────────────────────────────────────────────────────────────────

function normalizeParent(p) {
  return {
    id: p.id,
    name: p.full_name,
    email: p.email,
    phone: p.phone,
    athletes: (p.athlete_parents ?? []).map(ap => ({
      id: ap.athletes?.id,
      name: ap.athletes ? `${ap.athletes.first_name} ${ap.athletes.last_name}` : '',
      group: ap.athletes?.roster_group,
    })).filter(a => a.id),
  };
}

export function useTeamData(auth) {
  const [roster, setRoster] = useState([]);
  const [parents, setParents] = useState([]);
  const [events, setEvents] = useState([]);
  const [availability, setAvailability] = useState({});
  const [attendance, setAttendance] = useState({});
  const [channelMessages, setChannelMessages] = useState({});
  const [loading, setLoading] = useState(true);

  // slug → supabase UUID, used for sends in live mode
  const slugToId = useRef({});
  const idToSlug = useRef({});

  const teamId = auth.profile?.team_id;

  // ── Demo mode ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDemo) return;
    setRoster(INITIAL_ROSTER);
    setEvents(INITIAL_EVENTS);
    setAvailability(INITIAL_AVAILABILITY);
    setAttendance({});          // no prior attendance in demo — coach takes it live
    setChannelMessages(INITIAL_CHANNEL_MESSAGES);
    // Derive demo parents from roster's parent1/parent2 data
    const demoParentMap = new Map();
    INITIAL_ROSTER.filter(m => m.group !== 'coaches').forEach(athlete => {
      [athlete.parent1, athlete.parent2].filter(Boolean).forEach(p => {
        if (!p.email) return;
        if (!demoParentMap.has(p.email)) {
          demoParentMap.set(p.email, { id: p.email, name: p.name, email: p.email, phone: p.phone, athletes: [] });
        }
        demoParentMap.get(p.email).athletes.push({ id: athlete.id, name: athlete.name, group: athlete.group });
      });
    });
    setParents([...demoParentMap.values()]);
    setLoading(false);
  }, []);

  // ── Supabase mode ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !supabase) return;
    if (!teamId) {
      // Profile loaded but no team assigned — don't hang
      setLoading(false);
      return;
    }

    let realtimeChannel;

    async function load() {
      setLoading(true);
      try {

      // Athletes
      const { data: athleteRows } = await supabase
        .from('athletes')
        .select(`
          id, first_name, last_name, weight, grade, school, roster_group,
          athlete_parents(is_primary, profiles(full_name, email, phone))
        `)
        .eq('team_id', teamId)
        .eq('active', true)
        .order('weight', { ascending: true });

      // Coaches
      const { data: coachRows } = await supabase
        .from('coaches')
        .select(`id, title, roster_group, profiles(full_name, email, phone)`)
        .eq('team_id', teamId)
        .eq('active', true);

      const normalizedRoster = [
        ...(coachRows ?? []).map(normalizeCoach),
        ...(athleteRows ?? []).map(normalizeAthlete),
      ];
      setRoster(normalizedRoster);

      // Parents
      const { data: parentRows } = await supabase
        .from('profiles')
        .select(`
          id, full_name, email, phone,
          athlete_parents!parent_id(
            athletes(id, first_name, last_name, roster_group)
          )
        `)
        .eq('team_id', teamId)
        .eq('role', 'parent');
      setParents((parentRows ?? []).map(normalizeParent));

      // Events
      const today = new Date().toISOString().slice(0, 10);
      const { data: eventRows } = await supabase
        .from('events')
        .select('id, title, event_type, event_date, start_time, location_name, roster_group')
        .eq('team_id', teamId)
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(20);

      const normalizedEvents = (eventRows ?? []).map(normalizeEvent);
      setEvents(normalizedEvents);

      // Availability + Attendance (fetched together for the same event IDs)
      if (normalizedEvents.length > 0) {
        const eventIds = normalizedEvents.map(e => e.id);

        const [{ data: availRows }, { data: attendRows }] = await Promise.all([
          supabase
            .from('availability')
            .select('event_id, athlete_id, status')
            .in('event_id', eventIds),
          supabase
            .from('attendance')
            .select('event_id, athlete_id, status')
            .in('event_id', eventIds),
        ]);

        const availMap = {};
        (availRows ?? []).forEach(row => {
          availMap[`${row.athlete_id}-${row.event_id}`] = row.status;
        });
        setAvailability(availMap);

        const attendMap = {};
        (attendRows ?? []).forEach(row => {
          attendMap[`${row.athlete_id}-${row.event_id}`] = row.status;
        });
        setAttendance(attendMap);
      }

      // Channels + messages
      const { data: channelRows } = await supabase
        .from('channels')
        .select('id, name, channel_type, roster_group, is_private')
        .eq('team_id', teamId);

      const sToId = {};
      const iToS = {};
      (channelRows ?? []).forEach(ch => {
        const slug = CHANNEL_NAME_TO_SLUG[ch.name];
        if (slug) {
          sToId[slug] = ch.id;
          iToS[ch.id] = slug;
        }
      });
      slugToId.current = sToId;
      idToSlug.current = iToS;

      // Fetch messages for all known channels
      const channelUUIDs = Object.values(sToId);
      if (channelUUIDs.length > 0) {
        const { data: msgRows } = await supabase
          .from('messages')
          .select('id, channel_id, sender_name, sender_role, is_ai, content, is_pinned, created_at')
          .in('channel_id', channelUUIDs)
          .order('created_at', { ascending: true });

        const grouped = { ai: [] };
        (msgRows ?? []).forEach(m => {
          const slug = iToS[m.channel_id];
          if (slug) {
            if (!grouped[slug]) grouped[slug] = [];
            grouped[slug].push(normalizeMessage(m));
          }
        });
        setChannelMessages(grouped);
      } else {
        setChannelMessages({ ai: [] });
      }

      } catch (err) {
        console.error('MatMind: failed to load team data', err);
      } finally {
        setLoading(false);
      }

      // Realtime subscription for new messages
      realtimeChannel = supabase
        .channel('matmind-messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
          const slug = idToSlug.current[payload.new.channel_id];
          if (!slug) return;
          const msg = normalizeMessage(payload.new);
          setChannelMessages(prev => ({
            ...prev,
            [slug]: [...(prev[slug] ?? []), msg],
          }));
        })
        .subscribe();
    }

    load();
    return () => { realtimeChannel?.unsubscribe(); };
  }, [teamId]);

  // ── createEvent ─────────────────────────────────────────────────────────────
  const createEvent = useCallback(async ({ title, type = 'practice', date, time, location = '', group = 'all' }) => {
    const tempId = `local-${Date.now()}`;
    const normalized = { id: tempId, title, type, date, time, location, group };
    setEvents(prev => [...prev, normalized]);

    if (isDemo || !supabase || !teamId) return;

    // Convert any common time string → "HH:MM:00" for Postgres TIME column.
    // Falls back to 18:00:00 (6 PM) rather than null to satisfy the NOT NULL constraint.
    const toSQLTime = (t) => {
      if (!t) return '18:00:00';
      const s = t.trim()
        // "6 PM" / "6 AM" → "6:00 PM"
        .replace(/^(\d{1,2})\s+(AM|PM)$/i, '$1:00 $2')
        // "6pm" → "6:00 PM"
        .replace(/^(\d{1,2})(am|pm)$/i, (_, h, ap) => `${h}:00 ${ap.toUpperCase()}`)
        // "6:30pm" → "6:30 PM"
        .replace(/(\d{1,2}:\d{2})(am|pm)/i, (_, t, ap) => `${t} ${ap.toUpperCase()}`);
      const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!m) {
        // Try 24-hour format: "18:00" or "18:00:00"
        const m24 = t.match(/^(\d{1,2}):(\d{2})/);
        if (m24) return `${String(parseInt(m24[1])).padStart(2, '0')}:${m24[2]}:00`;
        console.warn('MatMind: could not parse time, defaulting to 18:00:00:', t);
        return '18:00:00';
      }
      let h = parseInt(m[1]);
      if (m[3].toUpperCase() === 'PM' && h !== 12) h += 12;
      if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
      return `${String(h).padStart(2, '0')}:${m[2]}:00`;
    };

    const { data: row, error } = await supabase.from('events').insert({
      team_id: teamId,
      title,
      event_type: type,
      event_date: date,
      start_time: toSQLTime(time),
      location_name: location,
      roster_group: group === 'all' ? null : group,
      created_by: auth.user?.id ?? null,
    }).select('id').single();

    if (error) {
      console.error('MatMind: event insert failed', error.message, error);
      // Remove the optimistic entry so the UI doesn't show a ghost event
      setEvents(prev => prev.filter(e => e.id !== tempId));
      return { ok: false, error: error.message };
    } else if (row?.id) {
      // Replace temp ID with real UUID
      setEvents(prev => prev.map(e => e.id === tempId ? { ...e, id: row.id } : e));
    }
    return { ok: true };
  }, [auth, teamId]);

  // ── updateAvailabilityEntry ──────────────────────────────────────────────────
  const updateAvailabilityEntry = useCallback(async (athleteId, eventId, status) => {
    const key = `${athleteId}-${eventId}`;
    setAvailability(prev => ({ ...prev, [key]: status }));

    if (isDemo || !supabase) return;

    await supabase.from('availability').upsert({
      event_id: eventId,
      athlete_id: athleteId,
      status,
    }, { onConflict: 'event_id,athlete_id' });
  }, []);

  // ── recordAttendance ────────────────────────────────────────────────────────
  // status: 'present' | 'absent'
  // Optimistically updates local state, then upserts to Supabase.
  const recordAttendance = useCallback(async (athleteId, eventId, status) => {
    const key = `${athleteId}-${eventId}`;

    // Optimistic update
    setAttendance(prev => ({ ...prev, [key]: status }));

    if (isDemo || !supabase) return { ok: true };

    const { error } = await supabase.from('attendance').upsert({
      event_id:    eventId,
      athlete_id:  athleteId,
      status,
      recorded_by: auth.user?.id ?? null,
      recorded_at: new Date().toISOString(),
    }, { onConflict: 'event_id,athlete_id' });

    if (error) {
      console.error('MatMind: attendance upsert failed', error.message, error);
      // Roll back the optimistic update
      setAttendance(prev => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  }, [auth]);

  // ── sendMessage ─────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (channelSlug, text) => {
    const senderName = auth.profile?.full_name ?? 'Coach';
    const senderRole = auth.profile?.role ?? 'coach';
    const newMsg = {
      id: Date.now(),
      sender: senderName,
      role: senderRole,
      text,
      time: 'Now',
      pinned: false,
    };

    if (isDemo || !supabase) {
      setChannelMessages(prev => ({
        ...prev,
        [channelSlug]: [...(prev[channelSlug] ?? []), newMsg],
      }));
      return;
    }

    const channelId = slugToId.current[channelSlug];
    if (!channelId) return;

    await supabase.from('messages').insert({
      channel_id: channelId,
      sender_id: auth.user?.id ?? null,
      sender_name: senderName,
      sender_role: senderRole,
      content: text,
      is_ai: false,
      is_pinned: false,
    });
    // Realtime subscription handles adding msg to state
  }, [auth]);

  return {
    roster,
    setRoster,
    parents,
    events,
    setEvents,
    availability,
    setAvailability,
    attendance,
    setAttendance,
    recordAttendance,
    channelMessages,
    sendMessage,
    createEvent,
    updateAvailabilityEntry,
    loading,
    isDemo,
  };
}
