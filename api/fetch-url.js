// MatMind URL Fetcher — Vercel Serverless Function
// Fetches a web page server-side (avoids CORS), strips the HTML, and returns
// clean text suitable for a Knowledge Base entry.
// No auth required — reading public web pages is inherently public.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body ?? {};
  if (!url?.trim()) return res.status(400).json({ error: 'url is required' });

  let targetUrl;
  try {
    targetUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return res.status(400).json({ error: 'Only http/https URLs are supported' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const response = await fetch(targetUrl.href, {
      headers: {
        'User-Agent': 'MatMind/1.0 (+https://mat-mind.com; team KB importer)',
        'Accept':     'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(400).json({ error: `Server returned ${response.status} — page may require login or not exist` });
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return res.status(400).json({ error: 'URL must point to a web page, not a file or API' });
    }

    const html = await response.text();

    // ── Extract title ──────────────────────────────────────────────────────────
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle  = titleMatch
      ? titleMatch[1].trim().replace(/\s+/g, ' ').replace(/\s*[|\-–]\s*.+$/, '') // strip site name suffix
      : targetUrl.hostname;

    // ── Extract and clean content ──────────────────────────────────────────────
    const content = html
      // Drop non-content blocks entirely
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      // Block-level elements → newlines so paragraphs stay readable
      .replace(/<\/?(p|div|h[1-6]|li|ul|ol|br|tr|td|th|blockquote|section|article|main)[^>]*>/gi, '\n')
      // Strip all remaining tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#39;/g, "'")
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–')
      .replace(/&hellip;/g, '…')
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    // Trim to a reasonable KB entry size (Claude's context has limits)
    const trimmed = content.length > 8000
      ? content.slice(0, 8000) + '\n\n[Content truncated — full page has more text. Edit to keep only what\'s relevant.]'
      : content;

    return res.status(200).json({
      title:   pageTitle,
      content: trimmed,
      url:     targetUrl.href,
      length:  content.length,
    });

  } catch (err) {
    if (err.name === 'AbortError' || err.name === 'TimeoutError') {
      return res.status(400).json({ error: 'Request timed out — the website took too long to respond' });
    }
    console.error('fetch-url error:', err.message);
    return res.status(400).json({ error: `Could not fetch page: ${err.message}` });
  }
}
