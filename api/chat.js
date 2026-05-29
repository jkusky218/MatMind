// MatMind AI Chat — Vercel Serverless Function
// Calls Claude Haiku 4.5 with team context via prompt caching

export default async function handler(req, res) {
  // CORS headers for frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, history = [], roster, events, availability, channels, userRole, userName } = req.body;

  if (!message) return res.status(400).json({ error: 'Message is required' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

  // Build the system prompt with team context (this gets cached)
  const systemPrompt = buildSystemPrompt({ roster, events, availability, channels, userRole, userName });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: systemPrompt,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          // Prior turns (alternating user/assistant), capped at last 10 to keep tokens low
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
    const aiText = data.content?.[0]?.text || 'Sorry, I couldn\'t process that. Try again?';

    // Parse actions from AI response (AI returns them in a structured format)
    const { text, actions, followUp, intents } = parseAIResponse(aiText);

    return res.status(200).json({
      text,
      actions,
      followUp,
      intents,
      usage: {
        input_tokens: data.usage?.input_tokens,
        output_tokens: data.usage?.output_tokens,
        cache_read: data.usage?.cache_read_input_tokens,
        cache_creation: data.usage?.cache_creation_input_tokens,
      },
    });
  } catch (error) {
    console.error('MatMind AI error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

function buildSystemPrompt({ roster = [], events = [], availability = {}, channels = [], userRole = 'coach', userName = 'Coach' }) {
  const athletes = roster.filter(r => r.group !== 'coaches');
  const coaches = roster.filter(r => r.group === 'coaches');

  const rosterSummary = athletes.length > 0
    ? athletes.map(a => `- ${a.name} | ${a.weight}lbs | ${a.grade} | ${a.group} | Parent: ${a.parent1?.name || 'N/A'}`).join('\n')
    : 'No athletes loaded yet.';

  const coachSummary = coaches.length > 0
    ? coaches.map(c => `- ${c.name} | ${c.role}`).join('\n')
    : 'No coaches loaded yet.';

  const eventSummary = events.length > 0
    ? events.map(e => `- ${e.title} | ${e.event_type || e.type} | ${e.event_date || e.date} ${e.start_time || e.time} | ${e.location_name || e.location} | Group: ${e.roster_group || e.group || 'all'}`).join('\n')
    : 'No events loaded yet.';

  const availSummary = Object.keys(availability).length > 0
    ? `${Object.values(availability).filter(v => v === 'confirmed').length} confirmed, ${Object.values(availability).filter(v => v === 'declined').length} declined, rest pending.`
    : 'No availability data yet.';

  return `You are MatMind, an AI assistant for Lovett Wrestling (The Lovett School, Atlanta, GA). Mascot: Lions 🦁

You are talking to ${userName} (${userRole}).

YOUR ROLE:
${userRole === 'coach' ? `- You are the coach's private command center. You can manage the roster, schedule, availability, and communications.
- When a coach asks you to take an action (add practice, mark someone unavailable, send a reminder), confirm what you did with checkmark items.
- Be proactive — mention upcoming events, availability gaps, and things the coach should know.
- You can draft emails and messages for the coach to approve before sending.` : `- You are a helpful AI assistant for parents. Answer questions about the schedule, events, and team policies.
- You cannot modify the roster or schedule — direct parents to contact a coach for changes.
- Be friendly, concise, and helpful. Use the team context below to answer accurately.`}

COMMUNICATION CHANNELS:
- MatMind AI: Private coach command center (coaches only)
- #Announcements: Team-wide updates
- #Advanced: Skill-based group (NOT age-based)
- #Beginner: Skill-based group (NOT age-based)
- #Tots: Youngest wrestlers
- 🔒Coaches Only: Staff-only channel

IMPORTANT: Beginner and Advanced groups are SKILL-based, not age-based. Athletes of any age can be in either group.

CURRENT COACHING STAFF:
${coachSummary}

CURRENT ROSTER (${athletes.length} athletes):
${rosterSummary}

UPCOMING EVENTS:
${eventSummary}

AVAILABILITY SUMMARY:
${availSummary}

RESPONSE FORMAT:
Respond naturally and conversationally. Keep responses concise — coaches are busy.

When reporting actions you've taken, format them as a list starting with "✅" for each completed action.
If there's a follow-up question or suggestion, put it on its own line starting with "💡".

DATA ACTIONS — CRITICAL:
When a coach asks you to add events/practices or update availability, you MUST emit a machine-readable action block as the very last thing in your response, on its own line, with no text after it. Use this exact JSON format:

{"intents":[{"type":"create_event","title":"TITLE","date":"YYYY-MM-DD","time":"H:MM AM/PM","location":"LOCATION","group":"GROUP"}]}

Rules for the intents block:
- Valid groups: "all", "advanced", "beginner", "tots", "coaches". Use "all" when it applies to everyone.
- If an event targets MULTIPLE specific groups (e.g. "Beginner and Advanced"), output ONE intent per group for each date.
- For recurring events (e.g. "every Monday in June"), output one intent per occurrence date.
- Calculate exact YYYY-MM-DD calendar dates from today's date (shown below). Do not use relative terms like "next Monday" — compute the actual date.
- "6:30 PM" and "18:30" are both valid time formats.
- If no data change is needed, omit the intents block entirely — do NOT output empty intents.
- The intents block must be valid JSON. Output it as a single line with no surrounding markdown.

Example for "add practice every Tuesday in June for Tots":
{"intents":[{"type":"create_event","title":"Tuesday Practice","date":"2026-06-02","time":"5:00 PM","location":"Lovett Gym","group":"tots"},{"type":"create_event","title":"Tuesday Practice","date":"2026-06-09","time":"5:00 PM","location":"Lovett Gym","group":"tots"},{"type":"create_event","title":"Tuesday Practice","date":"2026-06-16","time":"5:00 PM","location":"Lovett Gym","group":"tots"},{"type":"create_event","title":"Tuesday Practice","date":"2026-06-23","time":"5:00 PM","location":"Lovett Gym","group":"tots"},{"type":"create_event","title":"Tuesday Practice","date":"2026-06-30","time":"5:00 PM","location":"Lovett Gym","group":"tots"}]}

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
}

function parseAIResponse(rawText) {
  // Extract structured intents JSON block (Claude emits it as the last line)
  let intents = [];
  let textWithoutIntents = rawText;

  const intentMatch = rawText.match(/\{"intents"\s*:\s*\[[\s\S]*?\]\s*\}/);
  if (intentMatch) {
    try {
      const parsed = JSON.parse(intentMatch[0]);
      if (Array.isArray(parsed.intents)) {
        intents = parsed.intents;
      }
    } catch (e) {
      console.warn('MatMind: failed to parse intents JSON:', e.message);
    }
    // Remove the JSON block from the visible text
    textWithoutIntents = rawText.replace(intentMatch[0], '').trim();
  }

  const lines = textWithoutIntents.split('\n');
  const actions = [];
  const textLines = [];
  let followUp = null;

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
    intents,
  };
}
