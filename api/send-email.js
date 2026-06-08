/**
 * api/send-email.js
 *
 * POST /api/send-email
 * Body: { subject, body, groups, teamId, templateId? }
 *
 * Sends a newsletter via SendGrid to the parents/coaches in the specified groups.
 * Logs the broadcast to the `broadcasts` table.
 * Requires SENDGRID_API_KEY env var.
 */

import { createClient } from '@supabase/supabase-js';

function makeAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Convert markdown to basic HTML for email delivery */
function markdownToHtml(md) {
  return md
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)$/gm, '<h3 style="color:#1B3A5C;margin:16px 0 6px">$1</h3>')
    .replace(/^- (.+)$/gm, '<li style="margin:4px 0">$1</li>')
    .replace(/(<li.*<\/li>)/gs, '<ul style="padding-left:20px;margin:8px 0">$1</ul>')
    .replace(/\n\n+/g, '</p><p style="margin:10px 0">')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p style="margin:10px 0">')
    .replace(/$/, '</p>');
}

function buildHtmlEmail(subject, body, teamName, primaryColor = '#1B3A5C', secondaryColor = '#6BADE4') {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation">
  <tr><td align="center" style="padding:32px 16px">
    <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,${primaryColor} 0%,${primaryColor}cc 100%);border-radius:12px 12px 0 0;padding:24px 28px">
        <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;letter-spacing:-0.3px">${teamName}</h1>
        <p style="color:${secondaryColor};margin:4px 0 0;font-size:12px;font-weight:600;letter-spacing:0.5px;text-transform:uppercase">Powered by MatMind</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="background:#fff;padding:28px;font-size:15px;line-height:1.7;color:#1a1a1a">
        ${markdownToHtml(body)}
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f0f4f8;border-radius:0 0 12px 12px;padding:16px 28px;font-size:11px;color:#888;text-align:center">
        You're receiving this because you're part of <strong>${teamName}</strong> on MatMind.
        <br>Manage your preferences in the MatMind app.
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, body, groups = ['all'], teamId, templateId, sentBy } = req.body ?? {};
  if (!subject?.trim()) return res.status(400).json({ error: 'subject is required' });
  if (!body?.trim())    return res.status(400).json({ error: 'body is required' });
  if (!teamId)          return res.status(400).json({ error: 'teamId is required' });

  const sendgridKey = process.env.SENDGRID_API_KEY;
  if (!sendgridKey) {
    return res.status(503).json({
      error: 'Email not configured',
      hint:  'Add SENDGRID_API_KEY to your Vercel environment variables to enable email sending.',
    });
  }

  let admin;
  try { admin = makeAdminClient(); } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  // ── Load team settings for branding + from-address ────────────────────────
  const { data: teamRow } = await admin
    .from('teams')
    .select('name, primary_color, secondary_color, team_settings(team_name, primary_color, secondary_color)')
    .eq('id', teamId)
    .single();

  const ts = Array.isArray(teamRow?.team_settings)
    ? teamRow.team_settings[0]
    : teamRow?.team_settings;

  const teamName     = ts?.team_name     || teamRow?.name    || 'Your Team';
  const primaryColor = ts?.primary_color || teamRow?.primary_color || '#1B3A5C';
  const secondColor  = ts?.secondary_color || teamRow?.secondary_color || '#6BADE4';

  // ── Collect recipient emails ───────────────────────────────────────────────
  let profilesQuery = admin.from('profiles').select('email').eq('team_id', teamId);

  const needsCoaches  = groups.includes('all') || groups.includes('coaches');
  const athleteGroups = groups.filter(g => !['all','coaches'].includes(g));

  if (!groups.includes('all')) {
    // Filter: parents of athletes in the requested groups + optionally coaches
    const conditions = [];
    if (athleteGroups.length) {
      // Get athlete IDs in target groups
      const { data: athleteRows } = await admin
        .from('athletes')
        .select('id')
        .eq('team_id', teamId)
        .in('roster_group', athleteGroups);
      const athleteIds = (athleteRows ?? []).map(a => a.id);

      if (athleteIds.length) {
        const { data: parentLinks } = await admin
          .from('athlete_parents')
          .select('parent_id')
          .in('athlete_id', athleteIds);
        const parentIds = [...new Set((parentLinks ?? []).map(l => l.parent_id))];
        conditions.push(...parentIds);
      }
    }
    if (needsCoaches) {
      const { data: coachRows } = await admin
        .from('coaches')
        .select('profile_id')
        .eq('team_id', teamId);
      conditions.push(...(coachRows ?? []).map(c => c.profile_id));
    }
    if (conditions.length) {
      profilesQuery = profilesQuery.in('id', [...new Set(conditions)]);
    } else {
      // Nothing to send to
      return res.status(200).json({ sent: 0, skipped: 0 });
    }
  }

  const { data: profiles } = await profilesQuery;
  const emails = [...new Set((profiles ?? []).map(p => p.email).filter(Boolean))];

  if (!emails.length) {
    return res.status(200).json({ sent: 0, skipped: 0, note: 'No recipients found for selected groups.' });
  }

  // ── Send via SendGrid ─────────────────────────────────────────────────────
  const htmlBody = buildHtmlEmail(subject, body, teamName, primaryColor, secondColor);

  const sgRes = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      personalizations: emails.map(to => ({ to: [{ email: to }] })),
      from:    { email: 'noreply@mat-mind.com', name: teamName },
      subject,
      content: [
        { type: 'text/plain', value: `${subject}\n\n${body}` },
        { type: 'text/html',  value: htmlBody },
      ],
    }),
  });

  if (!sgRes.ok) {
    const err = await sgRes.text();
    return res.status(502).json({ error: 'SendGrid error', detail: err.slice(0, 500) });
  }

  // ── Log to broadcasts table ───────────────────────────────────────────────
  await admin.from('broadcasts').insert({
    team_id:          teamId,
    sent_by:          sentBy ?? null,
    subject:          subject.trim(),
    body:             body.trim(),
    scope:            'email',
    recipient_count:  emails.length,
    template_id:      templateId ?? null,
  });

  return res.status(200).json({ sent: emails.length, skipped: 0 });
}
