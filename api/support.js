/**
 * api/support.js — MatMind Support AI
 *
 * Separate persona from the team AI. Handles product help, triage, and escalation.
 * Three-tier model:
 *   T1: AI answers immediately from KB context
 *   T2: AI creates a support_ticket (cannot fully resolve)
 *   T3: Auto-escalation for sensitive topics → ticket marked 'escalated'
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// ── Escalation detection ─────────────────────────────────────────────────────

// Support covers product questions and billing only.
// Conduct, safety, and team matters are not product support — refer to coach.
const COACH_TOPIC_PATTERN = /(abus|assault|harass|bully|bullied|bullying|unsafe|threat|hurt|injur|misconduct|inappropriate|fight|attack|violence|concuss)/i;

const ESCALATION_PATTERNS = [
  // Billing / subscription
  { pattern: /(billing|payment|charged|charge|refund|invoice|subscription|cancel.*plan)/i, category: 'billing', severity: 'high' },
  // Legal / privacy / data
  { pattern: /(legal|lawsuit|\bsue\b|ferpa|privacy|gdpr|data deletion|attorney|lawyer)/i, category: 'legal', severity: 'high' },
  // Account security
  { pattern: /(hacked|unauthorized|breach|compromised|someone else.*account)/i, category: 'security', severity: 'high' },
  // Explicit human request
  { pattern: /(talk to (a |someone|a human|real)|speak to (a |someone)|human agent|real person)/i, category: 'human_request', severity: 'medium' },
];

function detectEscalation(text) {
  for (const { pattern, category, severity } of ESCALATION_PATTERNS) {
    if (pattern.test(text)) return { escalate: true, category, severity };
  }
  return { escalate: false };
}

// ── Knowledge base loader ────────────────────────────────────────────────────

async function loadKB(supabase) {
  const { data } = await supabase
    .from('knowledge_base')
    .select('question, answer')
    .is('team_id', null)   // global MatMind KB only
    .order('created_at', { ascending: true });
  return data ?? [];
}

// ── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(kbEntries) {
  const kbText = kbEntries.length > 0
    ? kbEntries.map(e => `Q: ${e.question}\nA: ${e.answer}`).join('\n\n')
    : 'No knowledge base entries loaded.';

  return `You are **MatMind Support**, the friendly and efficient help desk AI for the MatMind app. You are NOT the team's MatMind AI coach — you are a separate support persona who helps users with product questions, account issues, and technical problems.

## Your personality
- Warm, clear, and reassuring
- Concise — one or two short paragraphs max
- Never mention competitor products
- Never reveal internal implementation details or API keys
- Refer to the team AI as "the MatMind AI" (not yourself)

## Knowledge base
Use the following product knowledge to answer questions accurately:

${kbText}

## What you can do
- Answer product how-to questions using the knowledge base above
- Help users troubleshoot common issues (login, RSVP, channels, roster)
- Acknowledge when you cannot solve an issue and offer to create a ticket

## What you must NOT do
- You are NOT authorised to modify any data, create events, or manage rosters — direct users to the MatMind AI for that
- Do not make up features that don't exist
- Do not speculate on pricing, roadmap, or business decisions
- **Only answer questions about the MatMind product and billing.** For anything else — team matters, athlete concerns, conduct, schedules, practice questions, or anything not directly about using the app — respond only with: "That's not something MatMind Support can help with. Please contact your coach directly."

## Escalation instructions
If the user's message involves athlete safety, child welfare, abuse, bullying, billing disputes, legal or privacy concerns, or if they explicitly ask for a human — your response must end with exactly this JSON marker on its own line:
ESCALATE:{"category":"<category>","severity":"<low|medium|high|critical>"}

Do not include this marker for normal product questions.`;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, conversationHistory = [], teamId, userId } = req.body ?? {};
  if (!message?.trim()) return res.status(400).json({ error: 'message is required' });

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey      = process.env.ANTHROPIC_API_KEY;

  // ── Step 1: coach-topic check — out of scope, return immediately, no ticket ──
  if (COACH_TOPIC_PATTERN.test(message)) {
    return res.status(200).json({
      reply:      "That's not something MatMind Support can help with. Please contact your coach directly.",
      escalated:  false,
      coachDefer: true,
      ticketId:   null,
    });
  }

  // ── Step 2: immediate local escalation check (before calling Claude) ─────────
  const escalationCheck = detectEscalation(message);

  // ── Step 2: load KB (skip if no Supabase configured) ────────────────────────
  let kbEntries = [];
  let supabase  = null;

  if (supabaseUrl && serviceKey) {
    supabase = createClient(supabaseUrl, serviceKey);
    kbEntries = await loadKB(supabase);
  }

  // ── Step 3: call Claude if API key is available ──────────────────────────────
  let replyText    = null;
  let shouldEscalate = escalationCheck.escalate;
  let escalationMeta = escalationCheck;

  if (apiKey) {
    const client = new Anthropic({ apiKey });

    const messages = [
      ...conversationHistory.slice(-10).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model:      'claude-haiku-4-5',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: buildSystemPrompt(kbEntries),
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages,
    });

    replyText = response.content[0]?.text ?? '';

    // Check if Claude's reply contains an escalation marker
    const escMatch = replyText.match(/ESCALATE:(\{.*?\})/);
    if (escMatch) {
      try {
        const parsed = JSON.parse(escMatch[1]);
        shouldEscalate = true;
        escalationMeta = { escalate: true, ...parsed };
      } catch {}
      // Strip the marker from the user-visible reply
      replyText = replyText.replace(/\nESCALATE:\{.*?\}/g, '').trim();
    }
  } else {
    // No API key — generate a basic fallback reply
    replyText = generateFallbackReply(message, kbEntries);
  }

  // ── Step 4: create/update ticket in Supabase if needed ───────────────────────
  let ticketId = req.body.ticketId ?? null;

  if (supabase && userId) {
    const newMessage = { role: 'user', content: message, ts: new Date().toISOString() };
    const aiMessage  = { role: 'assistant', content: replyText, ts: new Date().toISOString() };
    const appendMsgs = [newMessage, aiMessage];

    if (!ticketId) {
      // Create a new ticket (T2 or T3)
      const subject = message.slice(0, 80) + (message.length > 80 ? '…' : '');
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          team_id:      teamId ?? null,
          user_id:      userId,
          subject,
          conversation: appendMsgs,
          status:       shouldEscalate ? 'escalated' : 'open',
          severity:     escalationMeta.severity ?? 'low',
          category:     escalationMeta.category ?? 'general',
        })
        .select('id')
        .single();
      ticketId = ticket?.id ?? null;
    } else {
      // Append to existing ticket conversation
      await supabase.rpc('append_support_messages', {
        p_ticket_id: ticketId,
        p_messages:  appendMsgs,
        p_status:    shouldEscalate ? 'escalated' : 'in_progress',
      });
    }
  }

  return res.status(200).json({
    reply:     replyText,
    escalated: shouldEscalate,
    ticketId,
  });
}

// ── Fallback when no API key (demo / unconfigured) ───────────────────────────

function generateFallbackReply(message, kbEntries) {
  const lower = message.toLowerCase();

  // Try to match KB entries first
  for (const entry of kbEntries) {
    const keywords = entry.question.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const hits = keywords.filter(k => lower.includes(k));
    if (hits.length >= 2) return entry.answer;
  }

  if (lower.includes('add') && (lower.includes('athlete') || lower.includes('roster'))) {
    return 'To add an athlete, tell the MatMind AI in your private command center: "Add [name], [weight] lbs, [grade], [group]." The AI will confirm and add them to the roster.';
  }
  if (lower.includes('rsvp') || lower.includes('availability') || lower.includes('going')) {
    return 'Parents RSVP on the Schedule tab — tap "Going" or "Not Going" next to any event. Coaches see the live attendance summary instantly.';
  }
  if (lower.includes('password') || lower.includes('log in') || lower.includes('sign in') || lower.includes('login')) {
    return 'Having trouble signing in? Use the "Send a magic link instead" option on the login screen — enter your email and click the link we send. No password needed.';
  }
  if (lower.includes('channel') || lower.includes('message') || lower.includes('chat')) {
    return 'MatMind has 6 channels: MatMind AI (your private coach command center), #Announcements, #Advanced, #Beginner, #Tots, and Coaches Only. Group channels are skill-based, not age-based.';
  }
  if (lower.includes('demo')) {
    return 'Demo mode runs when no Supabase credentials are configured — everything works with sample data. To go live, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.';
  }

  return "Hi! I'm MatMind Support — here to help with product questions and account issues. What can I help you with today?\n\n**Common topics:**\n• Account & login issues\n• How to use roster, schedule, and AI commands\n• Technical issues or bugs\n• Billing and subscription questions";
}
