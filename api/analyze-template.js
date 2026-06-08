/**
 * api/analyze-template.js
 *
 * POST /api/analyze-template
 * Body: { emailText: string, teamId: string }
 *
 * Sends a pasted email to Claude Haiku and returns a structured template:
 *   { name, tone, sections: [{ id, type, title, description, guidance,
 *                               is_required, auto_populate, default_content }] }
 */

import Anthropic from '@anthropic-ai/sdk';

const SECTION_TYPES = [
  'greeting', 'this_week_schedule', 'tournament_update', 'practice_notes',
  'shoutouts', 'reminders', 'action_items', 'dues_update', 'custom',
];

const SYSTEM_PROMPT = `You are an expert at analyzing team communication emails.
Your job: read a pasted youth sports team newsletter or weekly email and extract its
template structure so it can be reused.

Return ONLY valid JSON — no prose, no markdown fences. The JSON must match this shape:
{
  "name": "string — short descriptive name for this template style",
  "tone": "one of: formal | casual | friendly | energetic",
  "sections": [
    {
      "id": "unique_snake_case_id",
      "type": "one of: greeting | this_week_schedule | tournament_update | practice_notes | shoutouts | reminders | action_items | dues_update | custom",
      "title": "display name for this section",
      "description": "one sentence describing what this section contains",
      "guidance": "instructions for the AI when filling this section in future emails, e.g. 'Keep shoutouts to 2-3 athletes. Use first names only.'",
      "is_required": true or false,
      "auto_populate": true if this section pulls from live data (schedule, availability), false if AI writes it,
      "default_content": "example or placeholder content from the original email (optional, can be empty string)"
    }
  ]
}

Rules:
- Extract sections in the order they appear in the email.
- Identify recurring structural patterns (e.g. always ends with "Go Lions!").
- If a section pulls from the schedule, events, or availability data, set auto_populate to true.
- Guidance should be specific and actionable, not generic.
- Return 3-8 sections. Merge very short adjacent sections of the same type.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { emailText } = req.body ?? {};
  if (!emailText?.trim()) return res.status(400).json({ error: 'emailText is required' });
  if (emailText.length > 20000) return res.status(400).json({ error: 'Email too long (max 20 000 chars)' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'AI not configured' });

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model:      'claude-haiku-4-5',
    max_tokens: 2048,
    system:     SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Here is the email to analyze:\n\n---\n${emailText.trim()}\n---\n\nReturn the JSON template structure.`,
      },
    ],
  });

  const raw = message.content[0]?.text?.trim() ?? '';

  // Strip markdown fences if Claude wrapped it anyway
  const jsonText = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return res.status(500).json({ error: 'AI returned invalid JSON', raw: jsonText.slice(0, 500) });
  }

  // Validate and normalise sections
  if (!Array.isArray(parsed.sections)) parsed.sections = [];
  parsed.sections = parsed.sections.map((s, i) => ({
    id:              s.id              || `section_${i}`,
    type:            SECTION_TYPES.includes(s.type) ? s.type : 'custom',
    title:           s.title          || 'Section',
    description:     s.description    || '',
    guidance:        s.guidance        || '',
    is_required:     s.is_required    !== false,
    auto_populate:   !!s.auto_populate,
    default_content: s.default_content || '',
  }));

  return res.status(200).json({
    name:     parsed.name || 'Weekly Newsletter',
    tone:     ['formal','casual','friendly','energetic'].includes(parsed.tone) ? parsed.tone : 'friendly',
    sections: parsed.sections,
  });
}
