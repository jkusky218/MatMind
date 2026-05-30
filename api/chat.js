// MatMind AI Chat — Vercel Serverless Function
// Calls Claude Haiku 4.5 with team context via prompt caching + tool use

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], roster, events, availability, attendance, channels, userRole, userName } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = buildSystemPrompt({ roster, events, availability, attendance, channels, userRole, userName });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        tools: [buildScheduleTool(), buildPostMessageTool()],
        tool_choice: { type: 'auto' },
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          ...(history || []).slice(-10),
          { role: 'user', content: message },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Claude API error:', response.status, errorData);
      return res.status(response.status).json({
        error: 'AI service error',
        details: errorData.error?.message || 'Unknown error',
      });
    }

    const data = await response.json();

    // Claude may return a mix of text blocks and tool_use blocks
    let aiText = '';
    let intents = [];

    for (const block of (data.content || [])) {
      if (block.type === 'text') {
        aiText += block.text;
      } else if (block.type === 'tool_use' && block.name === 'schedule_events') {
        // Tool call is structured and validated — far more reliable than in-text JSON
        const newIntents = (block.input?.events || []).map(e => ({
          type: 'create_event',
          title: e.title,
          date: e.date,
          time: e.time,
          location: e.location || 'Lovett Gym',
          group: e.group || 'all',
          eventType: e.eventType || 'practice',
        }));
        intents.push(...newIntents);
      } else if (block.type === 'tool_use' && block.name === 'post_to_channel') {
        intents.push({
          type: 'post_message',
          channel: block.input?.channel || 'announcements',
          message: block.input?.message || '',
        });
      }
    }

    // If Claude only returned tool calls with no text, synthesise a short reply
    if (!aiText.trim() && intents.length > 0) {
      const eventIntents = intents.filter(i => i.type === 'create_event');
      const postIntents  = intents.filter(i => i.type === 'post_message');

      if (eventIntents.length > 0) {
        const groups = [...new Set(eventIntents.map(i => i.group).filter(g => g && g !== 'all'))];
        aiText = `Done! I've added **${eventIntents.length} practice session${eventIntents.length !== 1 ? 's' : ''}** to the schedule`;
        if (groups.length > 1)      aiText += ` (${groups.join(' + ')})`;
        else if (groups.length === 1) aiText += ` for the ${groups[0]} group`;
        aiText += '.';
      }
      if (postIntents.length > 0) {
        const channels = postIntents.map(i => `#${i.channel}`).join(', ');
        if (aiText) aiText += ` Posted to ${channels}.`;
        else aiText = `Done! I've posted the message to ${channels}.`;
      }
    }

    const { text, actions, followUp } = parseAIResponse(aiText);

    return res.status(200).json({
      text,
      actions,
      followUp,
      intents,
      usage: {
        input_tokens:  data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
        cache_read:    data.usage?.cache_read_input_tokens,
        cache_creation: data.usage?.cache_creation_input_tokens,
      },
    });
  } catch (error) {
    console.error('MatMind AI error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ── Tool definitions ─────────────────────────────────────────────────────────

function buildPostMessageTool() {
  return {
    name: 'post_to_channel',
    description:
      'Post a message to a team channel. ' +
      'Use this when the coach asks you to post, announce, share, or publish something to a channel. ' +
      'Write the full message content — use emoji to boost team morale. ' +
      'For attendance leaderboards: compute rankings from the attendance data in your context, then call this tool.',
    input_schema: {
      type: 'object',
      required: ['channel', 'message'],
      properties: {
        channel: {
          type: 'string',
          enum: ['announcements', 'advanced', 'beginner', 'tots', 'coaches'],
          description: 'Which channel to post to. Use "announcements" for team-wide messages.',
        },
        message: {
          type: 'string',
          description: 'The message text to post. Markdown supported. Include emoji for engagement.',
        },
      },
    },
  };
}

function buildScheduleTool() {
  return {
    name: 'schedule_events',
    description:
      'Add one or more events to the Lovett Wrestling schedule. ' +
      'Call this whenever the coach asks to create, add, or schedule any practice, match, tournament, or other event. ' +
      'For recurring events (e.g. "every Monday in June") include one object per occurrence with exact YYYY-MM-DD dates. ' +
      'For events targeting multiple groups (e.g. "Beginner and Advanced") include a separate object per group per date.',
    input_schema: {
      type: 'object',
      required: ['events'],
      properties: {
        events: {
          type: 'array',
          description: 'List of individual event occurrences to create.',
          items: {
            type: 'object',
            required: ['title', 'date', 'time', 'group'],
            properties: {
              title:     { type: 'string', description: 'Event title, e.g. "Monday Practice"' },
              date:      { type: 'string', description: 'Exact date in YYYY-MM-DD format. Always calculate from today\'s date.' },
              time:      { type: 'string', description: 'Start time, e.g. "6:30 PM" or "18:30"' },
              location:  { type: 'string', description: 'Location name, e.g. "Murray Athletic Center"' },
              group: {
                type: 'string',
                enum: ['all', 'advanced', 'beginner', 'tots', 'coaches'],
                description: 'Roster group. Use "all" if no group specified. For multiple groups make separate entries.',
              },
              eventType: {
                type: 'string',
                enum: ['practice', 'match', 'tournament', 'meeting', 'other'],
                description: 'Type of event. Defaults to practice.',
              },
            },
          },
        },
      },
    },
  };
}

// ── Attendance summary helper ─────────────────────────────────────────────────
// Converts the flat { 'athleteId-eventId': 'present'|'absent' } map into a
// per-athlete leaderboard string Claude can reason over directly.

function buildAttendanceSummary(attendance = {}, roster = []) {
  const entries = Object.entries(attendance);
  if (!entries.length) return 'No attendance recorded yet.';

  const athletes = roster.filter(r => r.group !== 'coaches');
  const stats = {};

  for (const athlete of athletes) {
    const id = String(athlete.id);
    let present = 0, absent = 0;
    for (const [key, status] of entries) {
      // key format: "${athleteId}-${eventId}" — check prefix to avoid substring collisions
      if (key.startsWith(id + '-')) {
        if (status === 'present') present++;
        else if (status === 'absent') absent++;
      }
    }
    if (present > 0 || absent > 0) {
      stats[id] = { name: athlete.name, group: athlete.group, present, absent };
    }
  }

  const sorted = Object.values(stats).sort((a, b) => b.present - a.present || a.absent - b.absent);
  if (!sorted.length) return 'No attendance recorded yet.';

  return sorted
    .map(s => `- ${s.name} | ${s.group} | ${s.present} present, ${s.absent} absent`)
    .join('\n');
}

// ── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt({ roster = [], events = [], availability = {}, attendance = {}, userRole = 'coach', userName = 'Coach' }) {
  const athletes = roster.filter(r => r.group !== 'coaches');
  const coaches  = roster.filter(r => r.group === 'coaches');

  const rosterSummary = athletes.length > 0
    ? athletes.map(a => `- ${a.name} | ${a.weight}lbs | ${a.grade} | ${a.group} | Parent: ${a.parent1?.name || 'N/A'}`).join('\n')
    : 'No athletes loaded yet.';

  const coachSummary = coaches.length > 0
    ? coaches.map(c => `- ${c.name} | ${c.role}`).join('\n')
    : 'No coaches loaded yet.';

  const eventSummary = events.length > 0
    ? events.map(e => `- ${e.title} | ${e.event_type || e.type} | ${e.event_date || e.date} ${e.start_time || e.time} | ${e.location_name || e.location} | Group: ${e.roster_group || e.group || 'all'}`).join('\n')
    : 'No events scheduled yet.';

  const availSummary = Object.keys(availability).length > 0
    ? `${Object.values(availability).filter(v => v === 'confirmed').length} confirmed, ${Object.values(availability).filter(v => v === 'declined').length} declined, rest pending.`
    : 'No availability data yet.';

  const attendSummary = buildAttendanceSummary(attendance, roster);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are MatMind, an AI assistant for Lovett Wrestling (The Lovett School, Atlanta, GA). Mascot: Lions 🦁

You are talking to ${userName} (${userRole}). Today is ${today}.

YOUR ROLE:
${userRole === 'coach'
  ? `You are the coach's private command center.
- To add events to the schedule, use the schedule_events tool — do not just describe it, actually call the tool.
- When a coach asks to add any practice, match, or event, always call schedule_events with the exact dates.
- For recurring events, compute each exact YYYY-MM-DD date and include a separate entry per occurrence.
- For events targeting multiple groups (e.g. "Beginner and Advanced"), include a separate entry per group.
- After calling the tool, confirm briefly in your text response what you scheduled.
- To post a message to a channel, use the post_to_channel tool. When the coach asks to post, announce, or share something, call it immediately.
- For attendance leaderboards: read the ATTENDANCE RECORDS below, rank athletes by present count, compose an engaging message, then call post_to_channel.
- Be proactive — mention upcoming events, availability gaps, and things the coach should know.`
  : `You are a helpful AI assistant for parents.
- Answer questions about the schedule, events, and team policies.
- You cannot modify the roster or schedule — direct parents to contact a coach for changes.
- Be friendly, concise, and helpful.`}

COMMUNICATION CHANNELS:
- MatMind AI: Private coach command center (coaches only)
- #Announcements: Team-wide updates
- #Advanced: Skill-based group (NOT age-based)
- #Beginner: Skill-based group (NOT age-based)
- #Tots: Youngest wrestlers
- 🔒Coaches Only: Staff-only channel

IMPORTANT: Beginner and Advanced groups are SKILL-based, not age-based.

CURRENT COACHING STAFF:
${coachSummary}

CURRENT ROSTER (${athletes.length} athletes):
${rosterSummary}

UPCOMING EVENTS:
${eventSummary}

AVAILABILITY SUMMARY:
${availSummary}

ATTENDANCE RECORDS (present/absent per athlete — use for leaderboards and gamification):
${attendSummary}

RESPONSE FORMAT:
Respond naturally and conversationally. Keep responses concise — coaches are busy.
When reporting completed actions, list them starting with "✅".
For follow-up suggestions, start the line with "💡".`;
}

// ── Response parser ──────────────────────────────────────────────────────────

function parseAIResponse(rawText) {
  const lines = rawText.split('\n');
  const actions   = [];
  const textLines = [];
  let followUp    = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('✅')) {
      actions.push(trimmed.replace('✅', '').trim());
    } else if (trimmed.startsWith('💡')) {
      followUp = trimmed.replace('💡', '').trim();
    } else {
      textLines.push(line);
    }
  }

  return {
    text: textLines.join('\n').trim(),
    actions,
    followUp,
  };
}
