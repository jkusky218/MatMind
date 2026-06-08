// MatMind AI client — calls the Vercel serverless function

const AI_ENDPOINT = '/api/chat';

/**
 * Send a message to MatMind AI and get a response.
 *
 * @param {string} message - The user's message
 * @param {object} context - Team context (roster, events, availability, etc.)
 * @returns {Promise<{text: string, actions: string[], followUp: string|null}>}
 */
export async function sendToMatMind(message, context = {}, history = []) {
  // 25-second timeout — Vercel hobby functions time out at 10s, pro at 60s.
  // Without this, a hung connection spins the typing indicator forever.
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history,
        roster:        context.roster       || [],
        events:        context.events       || [],
        availability:  context.availability || {},
        attendance:    context.attendance   || {},
        knowledgeBase: context.kbEntries    || [],
        channels:      context.channels     || [],
        userRole:      context.userRole      || 'coach',
        userName:      context.userName      || 'Coach',
        teamName:      context.teamName      || 'My Team',
        gymName:       context.gymName       || 'Team Gym',
        emailTemplate: context.emailTemplate || null,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('MatMind AI error:', errorData);
      return {
        text: "I'm having trouble connecting right now. Try again in a moment.",
        actions: [],
        followUp: null,
        error: true,
      };
    }

    const data = await response.json();
    return {
      text: data.text || "I couldn't process that. Could you rephrase?",
      actions: data.actions || [],
      followUp: data.followUp || null,
      intents: data.intents || [],
      usage: data.usage,
      error: false,
    };
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    console.error('MatMind AI error:', isTimeout ? 'request timed out' : error);
    return {
      text: isTimeout
        ? "The AI is taking too long to respond. Try a shorter message or try again in a moment."
        : "I can't reach the AI service right now. Check your connection and try again.",
      actions: [],
      followUp: null,
      error: true,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if the AI service is available.
 * Useful for showing online/offline status in the UI.
 */
export async function checkAIHealth() {
  try {
    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'ping' }),
    });
    return response.ok;
  } catch {
    return false;
  }
}
