// MatMind AI Chat — Vercel Serverless Function
// Calls Claude Haiku 4.5 with team context via prompt caching + tool use

import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// Fire-and-forget: log AI call to ai_call_log for analytics. Never blocks the response.
async function logAICall({ teamId, userId, usage, toolCalls, latencyMs }) {
  try {
    const supabase = getServiceClient();
    if (!supabase) return;
    await supabase.from('ai_call_log').insert({
      team_id:           teamId   || null,
      user_id:           userId   || null,
      input_tokens:      usage?.input_tokens       ?? 0,
      output_tokens:     usage?.output_tokens      ?? 0,
      cache_read_tokens: usage?.cache_read_input_tokens ?? 0,
      tool_calls:        toolCalls?.length ? toolCalls : null,
      latency_ms:        latencyMs ?? null,
    });
  } catch (_) { /* best-effort — never fail the chat response */ }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], roster, events, availability, attendance, knowledgeBase, channels, userRole, userName, teamName = 'My Team', gymName = 'Team Gym', emailTemplate,
    teamId, userId } = req.body;
  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  const systemPrompt = buildSystemPrompt({ roster, events, availability, attendance, knowledgeBase, channels, userRole, userName, teamName, gymName, emailTemplate });

  // Only coaches/admins get the scheduling and posting tools.
  // Parents receive Q&A responses only — no tool access.
  const isCoach = userRole === 'coach' || userRole === 'admin';

  const callStart = Date.now();
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
        ...(isCoach ? {
          tools: [buildScheduleTool(teamName), buildPostMessageTool(), buildDraftNewsletterTool()],
          tool_choice: { type: 'auto' },
        } : {}),
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
          location: e.location || gymName,
          groups: Array.isArray(e.groups) ? e.groups.filter(g => g && g !== 'all') : [],
          eventType: e.eventType || 'practice',
        }));
        intents.push(...newIntents);
      } else if (block.type === 'tool_use' && block.name === 'post_to_channel') {
        intents.push({
          type: 'post_message',
          channel: block.input?.channel || 'announcements',
          message: block.input?.message || '',
        });
      } else if (block.type === 'tool_use' && block.name === 'draft_newsletter') {
        intents.push({
          type: 'newsletter_draft',
          groups:  block.input?.groups  ?? [],
          subject: block.input?.subject ?? '',
          body:    block.input?.body    ?? '',
        });
      }
    }

    // If Claude only returned tool calls with no text, synthesise a short reply
    if (!aiText.trim() && intents.length > 0) {
      const eventIntents      = intents.filter(i => i.type === 'create_event');
      const postIntents       = intents.filter(i => i.type === 'post_message');
      const newsletterIntents = intents.filter(i => i.type === 'newsletter_draft');

      if (eventIntents.length > 0) {
        const allGroups = [...new Set(eventIntents.flatMap(i => i.groups ?? []))];
        aiText = `Done! I've added **${eventIntents.length} event${eventIntents.length !== 1 ? 's' : ''}** to the schedule`;
        if (allGroups.length > 1)      aiText += ` (${allGroups.join(' + ')})`;
        else if (allGroups.length === 1) aiText += ` for the ${allGroups[0]} group`;
        aiText += '.';
      }
      if (postIntents.length > 0) {
        const channels = postIntents.map(i => `#${i.channel}`).join(', ');
        if (aiText) aiText += ` Posted to ${channels}.`;
        else aiText = `Done! I've posted the message to ${channels}.`;
      }
      if (newsletterIntents.length > 0) {
        const n = newsletterIntents[0];
        const groupLabel = n.groups.length ? n.groups.join(' + ') : 'all families';
        aiText = `Here's your draft newsletter for **${groupLabel}**. Review it below, then post to the channel or send via email.`;
      }
    }

    const { text, actions, followUp } = parseAIResponse(aiText);

    // Log to ai_call_log for CEO dashboard analytics (fire-and-forget)
    logAICall({
      teamId,
      userId,
      usage:      data.usage,
      toolCalls:  intents.map(i => i.type),
      latencyMs:  callStart ? Date.now() - callStart : null,
    });

    return res.status(200).json({
      text,
      actions,
      followUp,
      intents,
      usage: {
        input_tokens:   data.usage?.input_tokens,
        output_tokens:  data.usage?.output_tokens,
        cache_read:     data.usage?.cache_read_input_tokens,
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

function buildDraftNewsletterTool() {
  return {
    name: 'draft_newsletter',
    description:
      'Draft a weekly team newsletter for one or more roster groups. ' +
      'Call this once you know which group(s) the coach wants to target AND you have enough context to write the draft. ' +
      'Do NOT call this tool if the coach has not yet specified a group — ask first. ' +
      'Include upcoming events relevant to those groups, any important reminders the coach mentioned, ' +
      'and extract key details from Knowledge Base entries whose title matches any upcoming event (e.g. a tournament flyer). ' +
      'Write the body in friendly, parent-facing markdown. Use the team name and a warm tone.',
    input_schema: {
      type: 'object',
      required: ['groups', 'subject', 'body'],
      properties: {
        groups: {
          type: 'array',
          items: { type: 'string', enum: ['advanced', 'beginner', 'tots', 'all'] },
          description: 'Target roster group(s). Use ["all"] for all families.',
        },
        subject: {
          type: 'string',
          description: 'Email subject line, e.g. "Lovett Wrestling — Weekly Update · June 7"',
        },
        body: {
          type: 'string',
          description:
            'Full email body in markdown. Structure: greeting → this week\'s events (bullet list with dates/times/locations) → ' +
            'any tournament details extracted from KB entries → important reminders → sign-off from the coaching staff. ' +
            'Keep it friendly and skimmable. Bold key dates and names.',
        },
      },
    },
  };
}

function buildScheduleTool(teamName = 'the team') {
  return {
    name: 'schedule_events',
    description:
      `Add one or more events to the ${teamName} schedule. ` +
      'Call this whenever the coach asks to create, add, or schedule any practice, match, tournament, or other event. ' +
      'For recurring events (e.g. "every Monday in June") include one object per occurrence with exact YYYY-MM-DD dates. ' +
      'For recurring events (e.g. "every Monday in June") include one object per date. For events targeting multiple groups set groups to an array, e.g. ["beginner","advanced"].',
    input_schema: {
      type: 'object',
      required: ['events'],
      properties: {
        events: {
          type: 'array',
          description: 'List of individual event occurrences to create.',
          items: {
            type: 'object',
            required: ['title', 'date', 'time'],
            properties: {
              title:     { type: 'string', description: 'Event title, e.g. "Monday Practice"' },
              date:      { type: 'string', description: 'Exact date in YYYY-MM-DD format. Always calculate from today\'s date.' },
              time:      { type: 'string', description: 'Start time, e.g. "6:30 PM" or "18:30"' },
              location:  { type: 'string', description: 'Location name, e.g. "Murray Athletic Center"' },
              groups: {
                type: 'array',
                items: { type: 'string', enum: ['advanced', 'beginner', 'tots', 'coaches'] },
                description: 'Roster groups for this event. Omit or leave empty for all groups. Use multiple values for cross-group events, e.g. ["beginner","advanced"].',
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

function buildSystemPrompt({ roster = [], events = [], availability = {}, attendance = {}, knowledgeBase = [], channels = [], userRole = 'coach', userName = 'Coach', teamName = 'My Team', gymName = 'Team Gym', emailTemplate = null }) {
  const athletes = roster.filter(r => r.group !== 'coaches');
  const coaches  = roster.filter(r => r.group === 'coaches');

  const rosterSummary = athletes.length > 0
    ? athletes.map(a => `- ${a.name} | ${a.weight}lbs | ${a.grade} | ${a.group} | Parent: ${a.parent1?.name || 'N/A'}`).join('\n')
    : 'No athletes loaded yet.';

  const coachSummary = coaches.length > 0
    ? coaches.map(c => `- ${c.name} | ${c.role}`).join('\n')
    : 'No coaches loaded yet.';

  const eventSummary = events.length > 0
    ? events.map(e => {
        // Client sends normalized events with groups: string[] | null
        // Fall back to legacy single-group fields for any raw DB rows
        const groupStr = Array.isArray(e.groups) && e.groups.length
          ? e.groups.join(', ')
          : (e.roster_group || e.group) || 'all groups';
        return `- ${e.title} | ${e.event_type || e.type} | ${e.event_date || e.date} ${e.start_time || e.time} | ${e.location_name || e.location} | Groups: ${groupStr}`;
      }).join('\n')
    : 'No events scheduled yet.';

  const availSummary = Object.keys(availability).length > 0
    ? `${Object.values(availability).filter(v => v === 'confirmed').length} confirmed, ${Object.values(availability).filter(v => v === 'declined').length} declined, rest pending.`
    : 'No availability data yet.';

  const attendSummary = buildAttendanceSummary(attendance, roster);

  const kbSummary = knowledgeBase.length > 0
    ? knowledgeBase
        .map(e => `### ${e.title} [${e.category}]\n${e.content}`)
        .join('\n\n---\n\n')
    : 'No knowledge base entries yet.';

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return `You are MatMind, an AI assistant for ${teamName}. Default event location: ${gymName}.

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
- Be proactive — mention upcoming events, availability gaps, and things the coach should know.
- NEWSLETTER DRAFTING: When a coach asks to draft, write, or send a weekly email/newsletter/update:
  1. If they have NOT specified which group(s) to target, ask "Which group(s)? Beginners, Advanced, Tots, or all families?" before drafting.
  2. Once you know the group(s), call the draft_newsletter tool with a complete draft.
  3. Scan the KNOWLEDGE BASE for any entry whose title closely matches an upcoming event name — extract venue, check-in time, weigh-in info, registration notes, and include them in the newsletter body.
  4. Fold in any specific reminders or notes the coach mentioned in their message (e.g. "remind them about shoes", "stress attendance").
  5. Write in a warm, parent-facing tone — coaches are signing off, not writing to peers.${emailTemplate ? `
  6. IMPORTANT — Follow the team's saved email template exactly. Structure the newsletter using these sections in order:
${emailTemplate.sections.map((s, i) => `     ${i + 1}. ${s.title}${s.is_required ? ' [REQUIRED]' : ' [optional]'}${s.auto_populate ? ' [auto-populate from schedule data]' : ''}${s.guidance ? `\n        Guidance: ${s.guidance}` : ''}`).join('\n')}
     Tone: ${emailTemplate.tone}. Do not add sections not listed above unless the coach specifically requests it.` : ''}`
  : `You are MatMind, replying inside a team chat channel that parents and coaches share.
- Answer the question directly, then STOP. Keep it to 1–3 short sentences.
- Do NOT end with "Is there anything else I can help with?", "Let me know if…", or any
  follow-up offer. Just answer and stop — you are a guest in a human conversation.
- Only speak about the schedule, events, roster info, and team policies/FAQ.
- For changes (roster, schedule) or anything needing a person, say to contact a coach — in one line.
- If you don't have the info, say so in one sentence. Never guess or pad.
- Warm but brief. Skip greetings and avoid emoji unless it genuinely adds clarity.
- Do not discuss the app itself, settings, or how you're configured — that's for coaches.`}

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

KNOWLEDGE BASE (${knowledgeBase.length} entries — use this to answer parent questions and generate messages):
${kbSummary}

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
