// api/admin/dev.js — Development view for the CEO dashboard
// GET /api/admin/dev
// Returns: recent commits, open bug issues, last QA report summary,
//          deploy history, branch protection status.
// super_admin only.
//
// Env vars needed:
//   GITHUB_TOKEN  — classic PAT with repo:read scope (or fine-grained: contents + issues read)
//   GITHUB_REPO   — e.g. "jkusky218/MatMind"
//   VERCEL_TOKEN  — Vercel personal access token (read-only)
//   VERCEL_PROJECT_ID — Vercel project ID (from project settings)

import { requireSuperAdmin } from '../../src/lib/adminAuth.js';
import { createClient }       from '@supabase/supabase-js';
import fs                      from 'fs';
import path                    from 'path';

// ── GitHub helper ─────────────────────────────────────────────────────────────
async function ghFetch(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO || 'jkusky218/MatMind';
  if (!token) return { _missing: 'GITHUB_TOKEN' };

  const res = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[dev] GitHub API ${endpoint} → ${res.status}:`, body.message ?? body);
    return { _error: `GitHub ${res.status}: ${body.message ?? 'unknown'}` };
  }
  return res.json();
}

// ── Vercel helper ─────────────────────────────────────────────────────────────
async function vercelFetch(endpoint) {
  const token     = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token) return { _missing: 'VERCEL_TOKEN' };

  const url = projectId
    ? `https://api.vercel.com${endpoint}?projectId=${projectId}&limit=10`
    : `https://api.vercel.com${endpoint}?limit=10`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error(`[dev] Vercel API ${endpoint} → ${res.status}:`, body.error?.message ?? body);
    return { _error: `Vercel ${res.status}: ${body.error?.message ?? 'unknown'}` };
  }
  return res.json();
}

// ── Latest QA report ─────────────────────────────────────────────────────────
// Read the most recent report-*.md from docs/qa/reports/ via GitHub API.
async function fetchLatestQAReport() {
  try {
    // List files in reports directory
    const files = await ghFetch('/contents/docs/qa/reports');
    if (!Array.isArray(files)) return null;

    const reports = files
      .filter(f => f.name.startsWith('report-') && f.name.endsWith('.md'))
      .sort((a, b) => b.name.localeCompare(a.name)); // newest first

    if (!reports.length) return null;

    const latest = reports[0];
    const fileRes = await ghFetch(`/contents/docs/qa/reports/${latest.name}`);
    if (!fileRes?.content) return null;

    const content = Buffer.from(fileRes.content, 'base64').toString('utf-8');

    // Parse the summary line
    const resultMatch  = content.match(/Result:\*\*\s*([^\n]+)/);
    const dateMatch    = latest.name.match(/report-(\d{4}-\d{2}-\d{2})/);
    const failMatch    = content.match(/(\d+)\s*fail/);
    const passMatch    = content.match(/(\d+)\s*pass/);
    const warnMatch    = content.match(/(\d+)\s*warn/);

    return {
      filename:  latest.name,
      date:      dateMatch?.[1] ?? 'unknown',
      result:    resultMatch?.[1]?.trim() ?? 'unknown',
      passes:    parseInt(passMatch?.[1]  ?? '0'),
      fails:     parseInt(failMatch?.[1]  ?? '0'),
      warnings:  parseInt(warnMatch?.[1]  ?? '0'),
      // First 600 chars of report body for preview
      preview:   content.slice(0, 600).replace(/^#[^\n]+\n/, '').trim(),
    };
  } catch (_) {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET')     return res.status(405).json({ error: 'Method not allowed' });

  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  // Fire all requests in parallel
  const [commitsRaw, issuesRaw, branchRaw, deploysRaw, qaReport] = await Promise.allSettled([
    // Last 10 commits on main
    ghFetch('/commits?sha=main&per_page=10'),

    // Open issues labelled 'bug'
    ghFetch('/issues?state=open&labels=bug&per_page=20'),

    // Branch protection on main
    ghFetch('/branches/main'),

    // Vercel deployments
    vercelFetch('/v6/deployments'),

    // Latest QA report from repo
    fetchLatestQAReport(),
  ]);

  // ── Commits ───────────────────────────────────────────────────────────────
  const commitsData = commitsRaw.status === 'fulfilled' ? commitsRaw.value : null;
  const githubError = commitsData?._error || commitsData?._missing
    ? (commitsData._error ?? `Missing env var: ${commitsData._missing}`)
    : null;
  const commits = Array.isArray(commitsData)
    ? commitsData.slice(0, 10).map(c => ({
        sha:     c.sha?.slice(0, 7),
        message: c.commit?.message?.split('\n')[0] ?? '',
        author:  c.commit?.author?.name ?? '',
        date:    c.commit?.author?.date ?? '',
        url:     c.html_url ?? '',
      }))
    : [];

  // ── Issues ────────────────────────────────────────────────────────────────
  const issuesData = issuesRaw.status === 'fulfilled' ? issuesRaw.value : null;
  const issues = Array.isArray(issuesData)
    ? issuesData.map(i => ({
        number:  i.number,
        title:   i.title,
        state:   i.state,
        labels:  i.labels?.map(l => l.name) ?? [],
        created: i.created_at,
        url:     i.html_url,
      }))
    : [];

  // ── Branch protection ─────────────────────────────────────────────────────
  const branchData        = branchRaw.status === 'fulfilled' ? branchRaw.value : null;
  const branchProtected   = branchData?.protected ?? null;
  const requiresPR        = branchData?.protection?.required_pull_request_reviews != null ?? null;

  // ── Deploys ───────────────────────────────────────────────────────────────
  const deploysData = deploysRaw.status === 'fulfilled' ? deploysRaw.value : null;
  const vercelError = deploysData?._error || deploysData?._missing
    ? (deploysData._error ?? `Missing env var: ${deploysData._missing}`)
    : null;
  const deploys = Array.isArray(deploysData?.deployments)
    ? deploysData.deployments.slice(0, 10).map(d => ({
        uid:     d.uid,
        url:     d.url ? `https://${d.url}` : null,
        state:   d.state,    // READY | ERROR | BUILDING | CANCELED
        target:  d.target,   // production | preview
        created: d.createdAt,
        meta:    d.meta?.githubCommitMessage?.split('\n')[0] ?? '',
      }))
    : [];

  const lastDeploy = deploys[0] ?? null;

  // ── QA ────────────────────────────────────────────────────────────────────
  const qa = qaReport.status === 'fulfilled' ? qaReport.value : null;

  // ── Flags ─────────────────────────────────────────────────────────────────
  const hasOpenBugs    = issues.filter(i => i.labels.includes('bug')).length > 0;
  const lastDeployOk   = lastDeploy ? lastDeploy.state === 'READY' : null;
  const qaFailing      = qa ? qa.fails > 0 : null;

  const repo = process.env.GITHUB_REPO || 'jkusky218/MatMind';

  return res.status(200).json({
    commits,
    issues,
    branchProtected,
    requiresPR,
    deploys,
    lastDeploy,
    qa,
    flags: { hasOpenBugs, lastDeployOk, qaFailing },
    _debug: { githubError, vercelError },
    links: {
      github:  `https://github.com/${repo}`,
      vercel:  'https://vercel.com/dashboard',
      issues:  `https://github.com/${repo}/issues`,
      actions: `https://github.com/${repo}/actions`,
    },
  });
}
