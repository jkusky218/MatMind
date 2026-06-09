import { useState, useCallback } from 'react';
import { isDemo } from '../lib/supabase';

// ── Demo-mode local support responses ────────────────────────────────────────

// Support handles product questions and billing only.
// Everything else — including conduct, safety, team matters — goes to a coach.
const ESCALATION_PATTERNS = [
  // Billing / subscription
  /(billing|payment|charged|charge|refund|invoice|subscription|cancel.*plan)/i,
  // Legal / privacy / data
  /(legal|lawsuit|\bsue\b|ferpa|privacy|gdpr|data deletion|attorney|lawyer)/i,
  // Account security
  /(hacked|unauthorized|breach|compromised)/i,
  // Explicit human request
  /(talk to (a |someone|a human|real)|speak to (a |someone)|human agent|real person)/i,
];

// Topics that are out of scope for product support — coach handles these
const COACH_TOPIC_PATTERN = /(abus|assault|harass|bully|bullied|bullying|unsafe|threat|misconduct|inappropriate|hurt|injur|fight|attack|violence|concuss)/i;

function isEscalationNeeded(text) {
  return ESCALATION_PATTERNS.some(p => p.test(text));
}

function isCoachTopic(text) {
  return COACH_TOPIC_PATTERN.test(text);
}

function generateDemoResponse(message) {
  const lower = message.toLowerCase();

  // Conduct, safety, and team matters are not product support — refer to coach
  if (isCoachTopic(message)) {
    return {
      text: "That's not something MatMind Support can help with. Please contact your coach directly.",
      coachDefer: true,
    };
  }

  if (isEscalationNeeded(message)) {
    return {
      text: "I've created a support ticket for you. A member of the MatMind team will follow up within 1 business day.",
      escalated: true,
    };
  }
  if (lower.includes('add') && (lower.includes('athlete') || lower.includes('roster'))) {
    return { text: "To add an athlete, use the MatMind AI in your private command center — just say \"Add [name], [weight] lbs, [grade], [group (Tots/Beginner/Advanced)]\" and the AI will confirm and create the record." };
  }
  if (lower.includes('rsvp') || lower.includes('availability') || lower.includes('going')) {
    return { text: "Parents RSVP on the Schedule tab — tap \"Going\" or \"Not Going\" next to any event. Coaches see the live attendance count and names update in real time." };
  }
  if (lower.includes('password') || lower.includes('log in') || lower.includes('sign in') || lower.includes('login') || lower.includes('access')) {
    return { text: "Having trouble signing in? On the login screen, tap **\"Send a magic link instead\"** — enter your email and click the link we send you. No password required." };
  }
  if (lower.includes('channel') || lower.includes('message') || lower.includes('post')) {
    return { text: "MatMind has 6 channels: your private **MatMind AI** command center, **#Announcements** for team-wide updates, **#Advanced**, **#Beginner**, and **#Tots** for skill-based groups, and **Coaches Only** for staff. Ask your coach which one to use." };
  }
  if (lower.includes('group') || lower.includes('beginner') || lower.includes('advanced') || lower.includes('tots')) {
    return { text: "Groups in MatMind are **skill-based**, not age-based. Tots is for the youngest wrestlers. Beginner and Advanced are assigned by your coaching staff based on skill level — any age can be in either group." };
  }
  if (lower.includes('demo') || lower.includes('supabase') || lower.includes('connect')) {
    return { text: "You're in **demo mode** — the app runs on sample data without a Supabase connection. To go live, add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file and redeploy to Vercel." };
  }
  if (lower.includes('schedule') || lower.includes('event') || lower.includes('practice') || lower.includes('tournament')) {
    return { text: "Events are managed through the MatMind AI channel. Tell your coach's AI: \"Add practice Thursday at 6pm\" or \"Add a tournament Saturday at 9am for Advanced.\" Events then appear on the Schedule tab for everyone." };
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower === '') {
    return { text: "Hi there! I'm **MatMind Support** — here to help with any product questions or issues.\n\nHere's what I can help with:\n• **Login & access** problems\n• **How-to** questions (roster, schedule, channels, AI commands)\n• **Technical issues** or bugs\n• **Billing** and account questions\n\nWhat can I help you with?" };
  }

  return {
    text: "Good question! I want to make sure I give you the right answer. Could you give me a bit more detail?\n\nOr if you'd like, I can connect you with the MatMind support team — just say \"I'd like to talk to someone\" and I'll create a ticket for you.",
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

const INITIAL_GREETING = {
  id: 'greeting',
  role: 'support',
  sender: 'MatMind Support',
  text: "Hi! I'm **MatMind Support** — here to help with app and billing questions.\n\nFor anything else — team matters, practice questions, athlete concerns — please contact your coach directly.",
  time: 'Now',
};

const QUICK_PROMPTS = [
  "How do I add an athlete?",
  "A parent can't log in",
  "How does RSVP work?",
];

export function useSupportChat({ auth }) {
  const [messages, setMessages]   = useState([INITIAL_GREETING]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [ticketId, setTicketId]   = useState(null);
  const [escalated, setEscalated] = useState(false);

  const conversationHistory = messages
    .filter(m => m.id !== 'greeting')
    .map(m => ({
      role:    m.role === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading) return;

    const userMsg = {
      id:     Date.now(),
      role:   'user',
      sender: auth.profile?.full_name ?? 'You',
      text:   text.trim(),
      time:   'Now',
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      let reply, didEscalate, newTicketId;

      if (isDemo) {
        // Demo mode — local response generation
        await new Promise(r => setTimeout(r, 700 + Math.random() * 500));
        const result = generateDemoResponse(text);
        reply        = result.text;
        didEscalate  = result.escalated ?? false;
        if (result.coachDefer) {
          // Out of scope — no ticket created, just show the redirect message
          setMessages(prev => [...prev, {
            id: Date.now() + 1, role: 'support', sender: 'MatMind Support',
            text: reply, coachDefer: true, time: 'Now',
          }]);
          setLoading(false);
          return;
        }
      } else {
        // Live mode — call /api/support
        const res = await fetch('/api/support', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            conversationHistory,
            teamId:   auth.profile?.team_id ?? null,
            userId:   auth.user?.id ?? null,
            ticketId,
          }),
        });
        const data = await res.json();
        reply       = data.reply;
        didEscalate = data.escalated ?? false;
        newTicketId = data.ticketId ?? null;
        if (newTicketId) setTicketId(newTicketId);
      }

      if (didEscalate) setEscalated(true);

      const aiMsg = {
        id:        Date.now() + 1,
        role:      'support',
        sender:    'MatMind Support',
        text:      reply,
        escalated: didEscalate,
        time:      'Now',
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error('[SupportChat] error:', err);
      setMessages(prev => [...prev, {
        id:     Date.now() + 1,
        role:   'support',
        sender: 'MatMind Support',
        text:   "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        time:   'Now',
      }]);
    } finally {
      setLoading(false);
    }
  }, [auth, conversationHistory, loading, ticketId]);

  return {
    messages,
    input,
    setInput,
    loading,
    escalated,
    ticketId,
    sendMessage,
    quickPrompts: QUICK_PROMPTS,
  };
}
