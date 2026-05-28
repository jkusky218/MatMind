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
    school: 'Lovett',
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

export function useTeamData(auth) {
  const [roster, setRoster] = useState([]);
  const [events, setEvents] = useState([]);
  const [availability, setAvailability] = useState({});
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
    setChannelMessages(INITIAL_CHANNEL_MESSAGES);
    setLoading(false);
  }, []);

  // ── Supabase mode ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isDemo || !supabase || !teamId) return;

    let realtimeChannel;

    async function load() {
      setLoading(true);

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

      // Availability
      if (normalizedEvents.length > 0) {
        const eventIds = normalizedEvents.map(e => e.id);
        const { data: availRows } = await supabase
          .from('availability')
          .select('event_id, athlete_id, status')
          .in('event_id', eventIds);

        const availMap = {};
        (availRows ?? []).forEach(row => {
          availMap[`${row.athlete_id}-${row.event_id}`] = row.status;
        });
        setAvailability(availMap);
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

      setLoading(false);

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
    events,
    setEvents,
    availability,
    setAvailability,
    channelMessages,
    sendMessage,
    loading,
    isDemo,
  };
}
