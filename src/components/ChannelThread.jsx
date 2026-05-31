import { useState, useEffect, useRef } from 'react';
import { BRAND, GROUP_LABELS, GROUPS } from '../lib/constants';
import { Brain, Send, ChevLeft, Lock, ICON_MAP } from './Icons';
import ChatBubble from './ChatBubble';
import { sendToMatMind } from '../lib/ai';
import { uploadChannelFile } from '../lib/storage';
import { isDemo } from '../lib/supabase';

// ── Claude intent execution ───────────────────────────────────────────────────
// After Claude responds, it may include a structured intents array.
// We execute those here so the actual data mutations match what Claude describes.

const VALID_GROUPS = new Set(['all', 'advanced', 'beginner', 'tots', 'coaches']);

async function executeClaudeIntents(intents, { createEvent, updateAvailabilityEntry, sendMessage, roster, events }) {
  if (!intents?.length) return { succeeded: 0, errors: [] };
  const errors = [];
  let succeeded = 0;

  for (const intent of intents) {
    if (intent.type === 'create_event' && createEvent) {
      // Validate required fields
      if (!intent.date || !/^\d{4}-\d{2}-\d{2}$/.test(intent.date)) {
        errors.push(`Skipped "${intent.title}": missing or invalid date (got "${intent.date}")`);
        continue;
      }
      // Support both new groups[] array and legacy group string from older intents
      const groups = Array.isArray(intent.groups) && intent.groups.length
        ? intent.groups.filter(g => VALID_GROUPS.has(g) && g !== 'all')
        : intent.group && VALID_GROUPS.has(intent.group) && intent.group !== 'all'
          ? [intent.group]
          : null;
      console.log('[MatMind] Claude intent → create_event:', intent.title, intent.date, intent.time, groups);
      const result = await createEvent({
        title: intent.title || 'Practice',
        type: intent.eventType || 'practice',
        date: intent.date,
        time: intent.time || '6:00 PM',
        location: intent.location,
        groups,
      });
      if (result?.ok === false) {
        errors.push(`"${intent.title}" (${intent.date}): ${result.error}`);
      } else {
        succeeded++;
      }
    } else if (intent.type === 'post_message' && sendMessage && intent.message) {
      const channel = VALID_GROUPS.has(intent.channel) || intent.channel === 'announcements'
        ? intent.channel
        : 'announcements';
      console.log('[MatMind] Claude intent → post_message to', channel);
      await sendMessage(channel, intent.message);
      succeeded++;
    }
  }

  return { succeeded, errors };
}

// ── Regex intent detection (offline fallback only) ────────────────────────────
// Used when the Claude API is unreachable. When Claude IS reachable, Claude
// emits structured intents itself and we skip this entirely.

function detectGroup(text) {
  if (text.includes('coaches') || text.includes('coaching staff')) return 'coaches';
  if (text.includes('tots'))     return 'tots';
  if (text.includes('beginner')) return 'beginner';
  if (text.includes('advanced')) return 'advanced';
  return null;
}

function getNextWeekdayDate(dayName) {
  const DAYS = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const target = DAYS.indexOf(dayName.toLowerCase());
  const today  = new Date();
  if (target === -1) {
    // "tomorrow" shortcut
    if (dayName.toLowerCase() === 'tomorrow') {
      const t = new Date(today);
      t.setDate(today.getDate() + 1);
      return localDateStr(t);
    }
    return localDateStr(today);
  }
  let diff = target - today.getDay();
  if (diff <= 0) diff += 7;
  const d = new Date(today);
  d.setDate(today.getDate() + diff);
  return localDateStr(d);
}

/** Returns YYYY-MM-DD using LOCAL date components (avoids UTC timezone shift). */
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function executeIntents(message, { roster, events, createEvent, updateAvailabilityEntry }) {
  const lower    = message.toLowerCase();
  const athletes = roster.filter(r => r.group !== 'coaches');
  const applied  = [];
  const errors   = [];

  // ── Add event / practice ───────────────────────────────────────────────────
  const isAddEvent =
    /\b(add|create|schedule|put|set up|make)\s+(a\s+|the\s+|new\s+)?practice\b/.test(lower) ||
    /\b(add|create|schedule)\s+(a\s+|the\s+|new\s+)?event\b/.test(lower) ||
    lower.includes('new practice');

  if (isAddEvent && createEvent) {
    const dayMatch  = lower.match(/(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    const timeMatch = lower.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    const groupStr  = detectGroup(lower);
    const groups    = groupStr ? [groupStr] : null;
    const day       = dayMatch ? dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1) : 'Thursday';
    const timeRaw   = timeMatch ? timeMatch[1] : '6:00 PM';
    // Normalise "6pm" / "6 PM" → "6:00 PM"
    const time = timeRaw
      .replace(/^(\d{1,2})\s+(AM|PM)$/i, '$1:00 $2')
      .replace(/(\d+)(am|pm)/i, (_, h, ap) => `${h}:00 ${ap.toUpperCase()}`)
      .replace(/(\d+:\d+)\s*(am|pm)/i, (_, t, ap) => `${t} ${ap.toUpperCase()}`);
    const date  = dayMatch ? getNextWeekdayDate(day) : localDateStr(new Date());
    const label = day === 'Tomorrow' ? 'Practice' : `${day} Practice`;
    console.log('[MatMind] createEvent:', { label, date, time, groups });
    const result = await createEvent({ title: label, type: 'practice', date, time, location: gymName, groups });
    if (result?.ok === false) {
      errors.push(`Could not save ${label} to the database: ${result.error}`);
    } else {
      applied.push(`Added ${label} at ${time}`);
    }
  }

  // ── Mark athlete unavailable ────────────────────────────────────────────────
  const isUnavailable = (lower.includes('sick') || lower.includes('injured')
    || lower.includes('unavailable') || lower.includes('pull') || lower.includes("can't make"))
    && !lower.includes('who');

  if (isUnavailable && updateAvailabilityEntry) {
    const athlete = athletes.find(a => lower.includes(a.name.toLowerCase().split(' ')[0]));
    if (athlete) {
      const nextEvent = events.find(e =>
        (e.type === 'tournament' || e.type === 'match')
        && (e.group === athlete.group || e.group === 'all')
      );
      if (nextEvent) {
        await updateAvailabilityEntry(athlete.id, nextEvent.id, 'declined');
        applied.push(`Marked ${athlete.name} unavailable for ${nextEvent.title}`);
      }
    }
  }

  return { applied, errors };
}

// ── Offline / demo fallback AI ────────────────────────────────────────────────
// Used when /api/chat is unreachable (local npm run dev without Vercel).
// NOTE: mutations are already handled by executeIntents above, so this only
// needs to return the conversational response text.

function generateFallbackResponse(message, roster, events, availability) {
  const lower    = message.toLowerCase();
  const athletes = roster.filter(r => r.group !== 'coaches');
  const coaches  = roster.filter(r => r.group === 'coaches');

  if ((lower.includes('who') && (lower.includes('confirmed') || lower.includes('available'))) || lower.includes('headcount')) {
    const event = events.find(e => lower.includes(e.title.toLowerCase()) || lower.includes(e.type))
                  ?? events.find(e => e.type === 'tournament');
    if (event) {
      const suffix         = `-${event.id}`;
      const confirmed      = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'confirmed');
      const declined       = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'declined');
      const eligible       = event.group === 'all' ? athletes : athletes.filter(r => r.group === event.group);
      const confirmedNames = confirmed.map(([k]) => athletes.find(r => String(r.id) === k.split('-')[0])?.name).filter(Boolean);
      const pending        = eligible.length - confirmed.length - declined.length;
      return {
        text: `Here's the availability for **${event.title}** (${GROUP_LABELS[event.group] ?? 'All'}):\n\n✅ **${confirmed.length} confirmed**: ${confirmedNames.join(', ')}\n❌ **${declined.length} declined**\n⏳ **${pending} pending**\n\nWant me to send a reminder to those who haven't responded?`,
        actions: [],
      };
    }
  }

  if (lower.includes('sick') || lower.includes('unavailable') || lower.includes('pull')) {
    const athlete = athletes.find(a => lower.includes(a.name.toLowerCase().split(' ')[0]));
    if (athlete) {
      const nextEvent = events.find(e => (e.type === 'tournament' || e.type === 'match') && (e.group === athlete.group || e.group === 'all'));
      if (nextEvent) {
        return {
          text: 'Done! I\'ve handled everything:',
          actions: [
            `Marked ${athlete.name} as unavailable for ${nextEvent.title}`,
            ...(athlete.parent1 ? [`Notified ${athlete.parent1.name}`] : []),
            ...(athlete.parent2 ? [`Notified ${athlete.parent2.name}`] : []),
            `${athlete.weight} lb slot is now open`,
          ],
          followUp: `Want me to check who else in **${GROUP_LABELS[athlete.group]}** could fill the **${athlete.weight} lb** slot?`,
        };
      }
    }
  }

  if (/\b(add|create|schedule|put|set up|make)\s+(a\s+|the\s+|new\s+)?practice\b/.test(lower) || lower.includes('new practice')) {
    const dayMatch = lower.match(/(tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    const day = dayMatch ? dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1) : 'Thursday';
    const group = detectGroup(lower) ?? 'all';
    const label = day === 'Tomorrow' ? 'Practice' : `${day} Practice`;
    return {
      text: 'Practice added to the schedule!',
      actions: [`Added ${label}`, `Group: ${group === 'all' ? 'All groups' : GROUP_LABELS[group]}`],
      followUp: 'Want me to post an announcement to the channel?',
    };
  }

  if (lower.includes('send') && (lower.includes('reminder') || lower.includes('email') || lower.includes('notify'))) {
    const group      = detectGroup(lower);
    const filtered   = group ? athletes.filter(r => r.group === group) : athletes;
    const groupLabel = group ? GROUP_LABELS[group] : 'all families';
    const parents    = filtered.reduce((n, r) => n + 1 + (r.parent2 ? 1 : 0), 0);
    return {
      text: `I've drafted a reminder for **${groupLabel}**:\n\n> *"Hi ${teamName} families! Quick reminder about upcoming events. Please confirm your availability in MatMind."*`,
      actions: [`Drafted for ${filtered.length} athletes (${parents} parent contacts)`, 'Ready to send via email + post to channel'],
      followUp: 'Send this via email, post to the channel, or both?',
    };
  }

  if (lower.includes('roster') || lower.includes('how many') || lower.includes('athletes')) {
    const counts = Object.fromEntries(GROUPS.map(g => [g, roster.filter(r => r.group === g).length]));
    return { text: `${teamName} roster:\n\n⭐ **${counts.coaches} Coaches**\n🟢 **${counts.advanced} Advanced** (skill-based)\n🔵 **${counts.beginner} Beginner** (skill-based)\n🟣 **${counts.tots} Tots**\n\n**${athletes.length} total athletes**.`, actions: [] };
  }

  if (lower.includes('this week') || lower.includes('upcoming') || lower.includes("what's coming") || lower.includes('schedule')) {
    const lines = events.slice(0, 5).map(e => {
      const icon = e.type === 'tournament' ? '🏆' : e.type === 'match' ? '🤼' : '💪';
      return `${icon} **${e.title}**${e.group !== 'all' ? ` [${GROUP_LABELS[e.group]}]` : ''} — ${e.date} at ${e.time}`;
    }).join('\n');
    return { text: `Here's what's coming up:\n\n${lines || 'No events scheduled yet.'}`, actions: [] };
  }

  if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi') || lower === '') {
    const confirmed = Object.values(availability).filter(v => v === 'confirmed').length;
    return { text: `Hey Coach! 🦁 Quick snapshot:\n\n📅 **${events.length} events** upcoming\n👥 **${athletes.length} athletes** + **${coaches.length} coaches**\n✅ **${confirmed} confirmations** logged\n\nWhat do you need?`, actions: [] };
  }

  return { text: `Here's what I can do:\n\n• **Availability**: "Who's confirmed for Peach State?"\n• **Updates**: "Marcus is sick, pull him from Saturday"\n• **Schedule**: "Add practice Wednesday at 6pm"\n• **Roster**: "How many athletes?"\n• **Comms**: "Send a reminder to beginner families"\n\nGo Lions! 🦁`, actions: [] };
}

function buildHistoryContent(resp) {
  const parts = [resp.text ?? ''];
  if (resp.actions?.length) parts.push(...resp.actions.map(a => `✅ ${a}`));
  if (resp.followUp)        parts.push(`💡 ${resp.followUp}`);
  return parts.filter(Boolean).join('\n').trim();
}

// ── ChannelThread ─────────────────────────────────────────────────────────────

export default function ChannelThread({
  channel,
  messages,
  onBack,
  onSendMessage,
  roster, events, availability, attendance, kbEntries,
  setRoster, setEvents, setAvailability,
  createEvent,
  updateAvailabilityEntry,
  senderName,
  userRole,
  teamSettings = {},
  teamId,
}) {
  const teamName = teamSettings.teamName || 'Team';
  const gymName  = teamSettings.gymName  || 'Team Gym';
  const isAI     = channel.id === 'ai';
  const confirmed = Object.values(availability).filter(v => v === 'confirmed').length;

  const greeting = {
    id: 0, sender: 'MatMind AI', role: 'ai',
    text: `Hey Coach! 🦁 You have **${events.length} events** upcoming and **${confirmed} confirmations** logged.\n\nAsk me anything about the team — schedule, roster, availability, or send a message for you.`,
    time: 'Now',
  };

  const [aiMsgs,          setAiMsgs]          = useState([greeting]);
  const [history,         setHistory]         = useState([]);
  const [input,           setInput]           = useState('');
  const [typing,          setTyping]          = useState(false);
  const [pendingFile,     setPendingFile]      = useState(null);  // { url, name, type, size }
  const [uploading,       setUploading]        = useState(false);
  const scrollRef   = useRef(null);
  const inputRef    = useRef(null);
  const fileInputRef = useRef(null);

  const canAttach = !isAI && !isDemo; // no attachments in AI channel or demo mode

  const displayMsgs = isAI ? aiMsgs : messages;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayMsgs, typing]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = ''; // reset so same file can be re-selected
    setUploading(true);
    try {
      const attachment = await uploadChannelFile(file, teamId);
      setPendingFile(attachment);
    } catch (err) {
      alert(err.message);
    }
    setUploading(false);
  };

  const handleSend = async () => {
    if ((!input.trim() && !pendingFile) || typing) return;
    const text = input.trim();
    const attachments = pendingFile ? [pendingFile] : null;
    setInput('');
    setPendingFile(null);

    if (isAI) {
      const userMsg = { id: Date.now(), sender: senderName ?? 'Coach', role: 'coach', text, time: 'Now' };
      setAiMsgs(prev => [...prev, userMsg]);
      setTyping(true);

      // ── 1. Get Claude's response (it includes structured intents when needed) ──
      const resp = await sendToMatMind(
        text,
        { roster, events, availability, attendance: attendance ?? {}, kbEntries: kbEntries ?? [], userRole: userRole ?? 'coach', userName: senderName ?? 'Coach', teamName, gymName },
        history,
      );

      let aiMsg;
      if (resp.error) {
        // ── Offline fallback: use regex detection + local response ─────────
        const { applied, errors } = await executeIntents(text, { roster, events, createEvent, updateAvailabilityEntry });
        const fallback = generateFallbackResponse(text, roster, events, availability);
        if (errors.length > 0) {
          aiMsg = {
            id: Date.now() + 1, sender: 'MatMind AI', role: 'ai', time: 'Now',
            text: '⚠️ Could not save changes to the database:',
            actions: errors,
            followUp: 'Check your connection or contact your admin.',
          };
        } else {
          aiMsg = { id: Date.now() + 1, sender: 'MatMind AI', role: 'ai', ...fallback, time: 'Now' };
        }
      } else {
        // ── 2. Execute Claude's structured intents ────────────────────────
        const { succeeded, errors } = await executeClaudeIntents(
          resp.intents,
          { createEvent, updateAvailabilityEntry, sendMessage: onSendMessage, roster, events },
        );

        // If any intents failed, append a warning to the response
        let augmentedMsg = { id: Date.now() + 1, sender: 'MatMind AI', role: 'ai', ...resp, time: 'Now' };
        if (errors.length > 0) {
          augmentedMsg = {
            ...augmentedMsg,
            followUp: `⚠️ Some changes couldn't be saved: ${errors.join('; ')}`,
          };
        }
        aiMsg = augmentedMsg;

        setHistory(prev => [
          ...prev,
          { role: 'user',      content: text },
          { role: 'assistant', content: buildHistoryContent(resp) },
        ]);
      }

      setAiMsgs(prev => [...prev, aiMsg]);
      setTyping(false);
    } else {
      onSendMessage(channel.id, text, attachments);
    }
  };

  const ChannelIcon = ICON_MAP[channel.icon] ?? ICON_MAP.hash;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 'calc(10px + env(safe-area-inset-top, 0px))', paddingBottom: '10px', paddingLeft: '12px', paddingRight: '12px', borderBottom: '1px solid #e8edf2', background: '#fff', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          {ChevLeft(20, BRAND.navy)}
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: channel.color + '15' }}>
          {ChannelIcon(16, channel.color)}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
            {channel.private ? Lock(11, '#aaa') : null}{channel.private ? ' ' : '# '}{channel.label}
          </p>
          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{channel.desc}</p>
        </div>
        {isAI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E' }} title="Claude API connected" />
            <div style={{ padding: '3px 8px', borderRadius: 6, background: BRAND.columbiaLight, fontSize: 10, fontWeight: 600, color: BRAND.navy }}>Private</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', WebkitOverflowScrolling: 'touch' }}>
        {displayMsgs.map(m => <ChatBubble key={m.id} msg={m} isUser={false} />)}

        {typing && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: BRAND.navy, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {Brain(14, BRAND.columbia)}
            </div>
            <div style={{ background: '#f0f4f8', borderRadius: '4px 14px 14px 14px', padding: '10px 16px', display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: BRAND.columbiaMid, animation: `bounce 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        {isAI && aiMsgs.length === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <p style={{ fontSize: 11, color: '#999', margin: '0 0 2px', paddingLeft: 36 }}>Try asking:</p>
            {[
              "Who's confirmed for the next tournament?",
              "Add practice Thursday at 6pm",
              "Post our top attendance leaders to #Announcements",
            ].map((q, i) => (
              <button key={i}
                onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                style={{ marginLeft: 36, textAlign: 'left', background: 'none', border: `1px dashed ${BRAND.columbiaMid}`, borderRadius: 10, padding: '8px 12px', fontSize: 12, color: BRAND.navy, cursor: 'pointer' }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      {canAttach && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
      )}

      {/* Attachment preview strip */}
      {(pendingFile || uploading) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 14px', borderTop: '1px solid #e8edf2', background: '#fafbfc',
        }}>
          {pendingFile?.type?.startsWith('image/') ? (
            <img src={pendingFile.url} alt="" style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 8, background: '#e8edf2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
              📄
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#1a1a1a' }}>
              {uploading ? 'Uploading…' : pendingFile?.name}
            </p>
            {!uploading && pendingFile && (
              <p style={{ fontSize: 11, color: '#999', margin: 0 }}>
                {(pendingFile.size / 1024).toFixed(0)} KB · ready to send
              </p>
            )}
          </div>
          {!uploading && (
            <button onClick={() => setPendingFile(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#bbb', lineHeight: 1, flexShrink: 0 }}>
              ✕
            </button>
          )}
        </div>
      )}

      {/* Input row */}
      <div style={{ paddingTop: '8px', paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', paddingLeft: '12px', paddingRight: '12px', borderTop: '1px solid #e8edf2', display: 'flex', gap: 8, alignItems: 'center', background: '#fff' }}>
        {/* Attach button */}
        {canAttach && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach image or PDF"
            style={{
              width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
              background: '#f0f4f8', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: uploading ? 'default' : 'pointer', fontSize: 16,
              opacity: uploading ? 0.5 : 1,
            }}
          >
            📎
          </button>
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={typing}
          placeholder={isAI ? 'Tell MatMind what you need...' : `Message #${channel.label}...`}
          style={{ flex: 1, background: '#f0f4f8', border: 'none', borderRadius: 20, padding: '10px 16px', fontSize: 14, outline: 'none', color: '#1a1a1a', opacity: typing ? 0.6 : 1 }}
        />
        <button
          onClick={handleSend}
          disabled={typing || (!input.trim() && !pendingFile) || uploading}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: (input.trim() || pendingFile) && !typing && !uploading ? BRAND.navy : '#ccd5de',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: (input.trim() || pendingFile) && !typing && !uploading ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}
        >
          {Send(15, '#fff')}
        </button>
      </div>
    </div>
  );
}
