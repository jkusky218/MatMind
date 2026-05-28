import { useState, useEffect, useRef } from 'react';
import { BRAND, GROUP_LABELS, GROUPS } from '../lib/constants';
import { Brain, Send, ChevLeft, Lock, ICON_MAP } from './Icons';
import ChatBubble from './ChatBubble';
import { sendToMatMind } from '../lib/ai';

// ── Offline / demo fallback AI engine ────────────────────────────────────────
// Used when /api/chat is unreachable (local npm run dev without Vercel).

function generateAIResponse(message, roster, events, availability, setRoster, setEvents, setAvailability) {
  const lower = message.toLowerCase();
  const athletes = roster.filter(r => r.group !== 'coaches');
  const coaches  = roster.filter(r => r.group === 'coaches');

  const detectGroup = (text) => {
    if (text.includes('coaches') || text.includes('coaching staff')) return 'coaches';
    if (text.includes('tots'))     return 'tots';
    if (text.includes('beginner')) return 'beginner';
    if (text.includes('advanced')) return 'advanced';
    return null;
  };

  if ((lower.includes('who') && (lower.includes('confirmed') || lower.includes('available'))) || lower.includes('headcount')) {
    const event = events.find(e => lower.includes(e.title.toLowerCase()) || lower.includes(e.type))
                  ?? events.find(e => e.type === 'tournament');
    if (event) {
      const suffix        = `-${event.id}`;
      const confirmed     = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'confirmed');
      const declined      = Object.entries(availability).filter(([k, v]) => k.endsWith(suffix) && v === 'declined');
      const eligible      = event.group === 'all' ? athletes : athletes.filter(r => r.group === event.group);
      const confirmedNames = confirmed.map(([k]) => athletes.find(r => String(r.id) === k.split('-')[0])?.name).filter(Boolean);
      const pending = eligible.length - confirmed.length - declined.length;
      return {
        text: `Here's the availability for **${event.title}** (${GROUP_LABELS[event.group] ?? 'All groups'}):\n\n✅ **${confirmed.length} confirmed**: ${confirmedNames.join(', ')}\n\n❌ **${declined.length} declined**\n\n⏳ **${pending} pending**\n\nWant me to send a reminder to those who haven't responded?`,
        actions: [],
      };
    }
  }

  if ((lower.includes('sick') || lower.includes('injured') || lower.includes("can't compete") || lower.includes('unavailable') || lower.includes('pull')) && !lower.includes('who')) {
    const athlete = athletes.find(a => lower.includes(a.name.toLowerCase().split(' ')[0]));
    if (athlete) {
      const nextEvent = events.find(e => (e.type === 'tournament' || e.type === 'match') && (e.group === athlete.group || e.group === 'all'));
      if (nextEvent) {
        setAvailability(prev => ({ ...prev, [`${athlete.id}-${nextEvent.id}`]: 'declined' }));
        return {
          text: 'Done! I\'ve handled everything:',
          actions: [
            `Marked ${athlete.name} as unavailable for ${nextEvent.title}`,
            `Notified ${athlete.parent1?.name} via text`,
            ...(athlete.parent2 ? [`Notified ${athlete.parent2.name} via text`] : []),
            `${athlete.weight} lb slot is now open`,
          ],
          followUp: `The **${athlete.weight} lb** slot is now open for ${nextEvent.title}. Want me to check who else in **${GROUP_LABELS[athlete.group]}** could fill in?`,
        };
      }
    }
  }

  if (lower.includes('add practice') || lower.includes('schedule practice') || lower.includes('new practice')) {
    const dayMatch  = lower.match(/(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
    const timeMatch = lower.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
    const group = detectGroup(lower) ?? 'all';
    const day   = dayMatch  ? dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1) : 'Thursday';
    const time  = timeMatch ? timeMatch[1].toUpperCase() : '6:00 PM';
    setEvents(prev => [...prev, { id: `local-${Date.now()}`, title: `${day} Practice`, type: 'practice', date: '2026-06-04', time, location: 'Lovett Gym', group }]);
    return {
      text: 'Practice added!',
      actions: [`Added ${day} practice at ${time}`, `Group: ${group === 'all' ? 'All groups' : GROUP_LABELS[group]}`],
      followUp: 'Want me to post an announcement to the channel?',
    };
  }

  if (lower.includes('send') && (lower.includes('reminder') || lower.includes('email') || lower.includes('notify'))) {
    const group      = detectGroup(lower);
    const filtered   = group === 'coaches' ? coaches : group ? athletes.filter(r => r.group === group) : athletes;
    const groupLabel = group ? GROUP_LABELS[group] : 'all families';
    const parentCount = filtered.reduce((n, r) => n + 1 + (r.parent2 ? 1 : 0), 0);
    return {
      text: `I've drafted a reminder for **${groupLabel}**:\n\n> *"Hi Lovett Wrestling families! Quick reminder about upcoming events. Please confirm your availability in MatMind. Go Lions! 🦁"*`,
      actions: [`Drafted for ${filtered.length} ${groupLabel} (${parentCount} recipients)`, 'Ready to send via email + post to channel'],
      followUp: 'Send this via email, post to the channel, or both?',
    };
  }

  if (lower.includes('roster') || lower.includes('how many') || lower.includes('athletes')) {
    const counts = Object.fromEntries(GROUPS.map(g => [g, roster.filter(r => r.group === g).length]));
    return { text: `Lovett Wrestling roster:\n\n⭐ **${counts.coaches} Coaches**\n🟢 **${counts.advanced} Advanced** (skill-based)\n🔵 **${counts.beginner} Beginner** (skill-based)\n🟣 **${counts.tots} Tots**\n\n**${athletes.length} athletes** total.`, actions: [] };
  }

  if (lower.includes('this week') || lower.includes('upcoming') || lower.includes("what's coming") || lower.includes('schedule')) {
    const lines = events.slice(0, 5).map(e => {
      const icon = e.type === 'tournament' ? '🏆' : e.type === 'match' ? '🤼' : '💪';
      return `${icon} **${e.title}**${e.group !== 'all' ? ` [${GROUP_LABELS[e.group]}]` : ''} — ${e.date} at ${e.time}`;
    }).join('\n');
    return { text: `Here's what's coming up:\n\n${lines}`, actions: [] };
  }

  if (lower.includes('hello') || lower.includes('hey') || lower.includes('hi') || lower === '') {
    const confirmed = Object.values(availability).filter(v => v === 'confirmed').length;
    return { text: `Hey Coach! 🦁 Quick snapshot:\n\n📅 **${events.length} events** upcoming\n👥 **${athletes.length} athletes** + **${coaches.length} coaches**\n✅ **${confirmed} confirmations** logged\n\nWhat do you need?`, actions: [] };
  }

  return { text: `Here's what I can do:\n\n• **Availability**: "Who's confirmed for Peach State?"\n• **Updates**: "Marcus is sick, pull him from Saturday"\n• **Schedule**: "Add practice Wednesday 5pm"\n• **Roster**: "How many athletes?"\n• **Comms**: "Send a reminder to beginner families"\n\nGo Lions! 🦁`, actions: [] };
}

// Reconstruct a plain-text summary of the AI response for conversation history
function buildHistoryContent(resp) {
  const parts = [resp.text ?? ''];
  if (resp.actions?.length) parts.push(...resp.actions.map(a => `✅ ${a}`));
  if (resp.followUp)        parts.push(`💡 ${resp.followUp}`);
  return parts.filter(Boolean).join('\n').trim();
}

// ── ChannelThread ─────────────────────────────────────────────────────────────

export default function ChannelThread({
  channel,
  messages,        // global state for non-AI channels
  onBack,
  onSendMessage,   // (channelSlug, text) for non-AI channels
  roster, events, availability,
  setRoster, setEvents, setAvailability,
  senderName,
  userRole,
}) {
  const isAI = channel.id === 'ai';

  const athletes     = roster.filter(r => r.group !== 'coaches');
  const confirmed    = Object.values(availability).filter(v => v === 'confirmed').length;

  const greeting = {
    id: 0, sender: 'MatMind AI', role: 'ai',
    text: `Hey Coach! 🦁 You have **${events.length} events** upcoming and **${confirmed} confirmations** logged.\n\nThis is your private command center. What do you need?`,
    time: 'Now',
  };

  const [aiMsgs,  setAiMsgs]  = useState([greeting]);
  const [history, setHistory] = useState([]); // Claude-format [{role,content}] for multi-turn
  const [input,   setInput]   = useState('');
  const [typing,  setTyping]  = useState(false);
  const scrollRef             = useRef(null);
  const inputRef              = useRef(null);

  const displayMsgs = isAI ? aiMsgs : messages;

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [displayMsgs, typing]);

  const handleSend = async () => {
    if (!input.trim() || typing) return;
    const text = input.trim();
    setInput('');

    if (isAI) {
      // Optimistically add user message to display
      const userMsg = {
        id: Date.now(),
        sender: senderName ?? 'Coach',
        role: 'coach',
        text,
        time: 'Now',
      };
      setAiMsgs(prev => [...prev, userMsg]);
      setTyping(true);

      // Snapshot history before this turn (passed to API)
      const currentHistory = history;

      // ── Try real Claude API ─────────────────────────────────────────────────
      const resp = await sendToMatMind(
        text,
        { roster, events, availability, userRole: userRole ?? 'coach', userName: senderName ?? 'Coach' },
        currentHistory,
      );

      let aiMsg;
      if (resp.error) {
        // ── Offline fallback: local engine ────────────────────────────────────
        const fallback = generateAIResponse(text, roster, events, availability, setRoster, setEvents, setAvailability);
        aiMsg = { id: Date.now() + 1, sender: 'MatMind AI', role: 'ai', ...fallback, time: 'Now' };
        // Don't update history — next real call will replay from saved history
      } else {
        aiMsg = { id: Date.now() + 1, sender: 'MatMind AI', role: 'ai', ...resp, time: 'Now' };
        // Advance history for next turn
        setHistory(prev => [
          ...prev,
          { role: 'user',      content: text },
          { role: 'assistant', content: buildHistoryContent(resp) },
        ]);
      }

      setAiMsgs(prev => [...prev, aiMsg]);
      setTyping(false);
    } else {
      onSendMessage(channel.id, text);
    }
  };

  const ChannelIcon = ICON_MAP[channel.icon] ?? ICON_MAP.hash;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #e8edf2', background: '#fff', flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'flex' }}>
          {ChevLeft(20, BRAND.navy)}
        </button>
        <div style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: channel.color + '15' }}>
          {ChannelIcon(16, channel.color)}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: 0, color: '#1a1a1a' }}>
            {channel.private ? Lock(11, '#aaa') : null}
            {channel.private ? ' ' : '# '}
            {channel.label}
          </p>
          <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{channel.desc}</p>
        </div>
        {isAI && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E' }} title="Claude API active" />
            <div style={{ padding: '3px 8px', borderRadius: 6, background: BRAND.columbiaLight, fontSize: 10, fontWeight: 600, color: BRAND.navy }}>
              Private
            </div>
          </div>
        )}
      </div>

      {/* ── Messages ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 12px', WebkitOverflowScrolling: 'touch' }}>
        {displayMsgs.map(m => (
          <ChatBubble key={m.id} msg={m} isUser={false} />
        ))}

        {/* Typing indicator */}
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

        {/* Suggestion chips — only on fresh AI channel */}
        {isAI && aiMsgs.length === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
            <p style={{ fontSize: 11, color: '#999', margin: '0 0 2px', paddingLeft: 36 }}>Try asking:</p>
            {[
              "Who's confirmed for the next tournament?",
              "What's coming up this week?",
              "Send a reminder to all families",
            ].map((q, i) => (
              <button key={i}
                onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                style={{
                  marginLeft: 36, textAlign: 'left', background: 'none',
                  border: `1px dashed ${BRAND.columbiaMid}`, borderRadius: 10,
                  padding: '8px 12px', fontSize: 12, color: BRAND.navy, cursor: 'pointer',
                }}>
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Input ── */}
      <div style={{ padding: '8px 12px', borderTop: '1px solid #e8edf2', display: 'flex', gap: 8, alignItems: 'center', background: '#fff' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          disabled={typing}
          placeholder={isAI ? 'Tell MatMind what you need...' : `Message #${channel.label}...`}
          style={{
            flex: 1, background: '#f0f4f8', border: 'none', borderRadius: 20,
            padding: '10px 16px', fontSize: 14, outline: 'none', color: '#1a1a1a',
            opacity: typing ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={typing || !input.trim()}
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: input.trim() && !typing ? BRAND.navy : '#ccd5de',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !typing ? 'pointer' : 'default',
            transition: 'background 0.2s',
          }}>
          {Send(15, '#fff')}
        </button>
      </div>
    </div>
  );
}
