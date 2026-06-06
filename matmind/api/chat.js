// MatMind AI Chat — Vercel Serverless Function
// Calls Claude Haiku 4.5 with team context via prompt caching

export default async function handler(req, res) {
  // CORS headers for frontend
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, roster, events, availability, channels, userRole, userName } = req.body;

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
    const { text, actions, followUp } = parseAIResponse(aiText);

    return res.status(200).json({
      text,
      actions,
      followUp,
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
Respond naturally and conversationally. When you take actions, list them clearly. Keep responses concise — coaches are busy.

When reporting actions you've taken, format them as a list starting with "✅" for each completed action.
If there's a follow-up question or suggestion, put it on its own line starting with "💡".

Example:
"Done! I've handled it:
✅ Marked Marcus as unavailable for Peach State Tournament
✅ Notified Darnell Johnson via text
✅ 126 lb slot is now open

💡 Want me to check who else in Advanced could fill the 126 lb slot?"

Today's date is ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`;
}

function parseAIResponse(rawText) {
  const lines = rawText.split('\n');
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
  };
}
