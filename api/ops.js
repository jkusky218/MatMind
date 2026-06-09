// api/admin/index.js — CEO Dashboard unified router
// Consolidates all admin sub-endpoints into one serverless function
// to stay within Vercel Hobby plan's 12-function limit.
//
// Routes (via ?route= query param):
//   overview   → GET metrics summary for overview page
//   health     → GET system health + write to system_health_log
//   tenants    → GET list / GET ?id= detail / POST deactivate
//   support    → GET queue / GET ?id= detail / POST actions
//   analytics  → GET usage analytics
//   dev        → GET commits, issues, deploys, QA report

import { createClient } from '@supabase/supabase-js';
import { requireSuperAdmin } from '../src/lib/adminAuth.js';

function getServiceClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service credentials not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

// ── GitHub / Vercel helpers ───────────────────────────────────────────────────
async function ghFetch(endpoint) {
  const token = process.env.GITHUB_TOKEN;
  const repo  = process.env.GITHUB_REPO || 'jkusky218/MatMind';
  if (!token) return { _missing: 'GITHUB_TOKEN' };
  const res = await fetch(`https://api.github.com/repos/${repo}${endpoint}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  });
  if (!res.ok) { const b = await res.json().catch(()=>({})); console.error(`[dev] GitHub ${endpoint} → ${res.status}:`, b.message); return { _error: `GitHub ${res.status}: ${b.message ?? 'unknown'}` }; }
  return res.json();
}

async function vercelFetch(endpoint) {
  const token = process.env.VERCEL_TOKEN;
  const pid   = process.env.VERCEL_PROJECT_ID;
  if (!token) return { _missing: 'VERCEL_TOKEN' };
  const url = pid ? `https://api.vercel.com${endpoint}?projectId=${pid}&limit=10` : `https://api.vercel.com${endpoint}?limit=10`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) { const b = await res.json().catch(()=>({})); return { _error: `Vercel ${res.status}: ${b.error?.message ?? 'unknown'}` }; }
  return res.json();
}

// ── Route handlers ────────────────────────────────────────────────────────────

async function handleOverview(req, res, supabase) {
  const ago1d = new Date(Date.now() - 24*60*60*1000).toISOString();
  const [tenantRes, ticketRes, healthRes, aiRes] = await Promise.allSettled([
    supabase.from('teams').select('*', { count: 'exact', head: true }),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('system_health_log').select('status, latency_ms, checked_at').order('checked_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('ai_call_log').select('*', { count: 'exact', head: true }).gte('created_at', ago1d),
  ]);
  return res.status(200).json({
    tenantCount:  tenantRes.status  === 'fulfilled' && !tenantRes.value.error  ? (tenantRes.value.count  ?? 0) : 0,
    openTickets:  ticketRes.status  === 'fulfilled' && !ticketRes.value.error  ? (ticketRes.value.count  ?? 0) : 0,
    lastHealth:   healthRes.status  === 'fulfilled' && !healthRes.value.error  ? (healthRes.value.data   ?? { status: 'unknown' }) : { status: 'unknown' },
    aiCallsToday: aiRes.status      === 'fulfilled' && !aiRes.value.error      ? (aiRes.value.count      ?? 0) : 0,
  });
}

async function handleHealth(req, res, supabase) {
  const start = Date.now();
  let supabaseOk = false, supabaseErr = null;
  try { const { error } = await supabase.from('teams').select('id').limit(1); supabaseOk = !error; supabaseErr = error?.message ?? null; } catch(e) { supabaseErr = e.message; }
  const latency_ms = Date.now() - start;
  const status     = supabaseOk ? 'ok' : 'down';
  const timestamp  = new Date().toISOString();
  try { await supabase.from('system_health_log').insert({ status, latency_ms, error_msg: supabaseErr }); } catch(_) {}
  const hasAuth = !!(req.headers?.authorization);
  if (!hasAuth) return res.status(supabaseOk ? 200 : 503).json({ status, latency_ms, timestamp });
  let history = [];
  try {
    const { data } = await supabase.from('system_health_log').select('checked_at, status, latency_ms').gte('checked_at', new Date(Date.now() - 48*60*60*1000).toISOString()).order('checked_at', { ascending: true });
    history = data ?? [];
  } catch(_) {}
  const latencies = history.map(r => r.latency_ms).filter(Boolean).sort((a,b)=>a-b);
  const total = history.length, okCount = history.filter(r=>r.status==='ok').length;
  return res.status(200).json({ status, latency_ms, timestamp, supabaseError: supabaseErr,
    uptimePct: total > 0 ? Math.round((okCount/total)*1000)/10 : null,
    p50_ms: latencies.length ? latencies[Math.floor(latencies.length*0.5)] : null,
    p95_ms: latencies.length ? latencies[Math.floor(latencies.length*0.95)] : null,
    history });
}

function inferTier(t) { if (t.status==='escalated') return 'T3'; if (t.status==='in_progress') return 'T2'; return 'T1'; }

async function handleTenants(req, res, supabase, admin) {
  if (req.method === 'POST') {
    const { teamId, active } = req.body ?? {};
    if (!teamId) return res.status(400).json({ error: 'teamId required' });
    const { error } = await supabase.from('teams').update({ active: active ?? false }).eq('id', teamId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }
  const teamId = req.query?.id;
  if (teamId) {
    const ago7d = new Date(Date.now()-7*24*60*60*1000).toISOString();
    const ago30d= new Date(Date.now()-30*24*60*60*1000).toISOString();
    const [teamRes,athRes,parRes,coachRes,evtRes,msgRes,aiRes,availRes] = await Promise.allSettled([
      supabase.from('teams').select('*, team_settings(team_name, logo_url, primary_color)').eq('id', teamId).single(),
      supabase.from('athletes').select('id',{count:'exact',head:true}).eq('team_id',teamId),
      supabase.from('profiles').select('id',{count:'exact',head:true}).eq('team_id',teamId).eq('role','parent'),
      supabase.from('coaches').select('id',{count:'exact',head:true}).eq('team_id',teamId),
      supabase.from('events').select('id',{count:'exact',head:true}).eq('team_id',teamId).gte('created_at',ago30d),
      supabase.from('messages').select('id',{count:'exact',head:true}).eq('team_id',teamId).gte('created_at',ago30d),
      supabase.from('ai_call_log').select('input_tokens,output_tokens,cache_read_tokens').eq('team_id',teamId).gte('created_at',ago7d),
      supabase.from('availability').select('status,event_id').eq('team_id',teamId).order('created_at',{ascending:false}).limit(500),
    ]);
    const team = teamRes.status==='fulfilled' ? teamRes.value.data : null;
    if (!team) return res.status(404).json({ error: 'Team not found' });
    const aiRows = aiRes.status==='fulfilled' ? (aiRes.value.data??[]) : [];
    const inp = aiRows.reduce((s,r)=>s+(r.input_tokens??0),0), out = aiRows.reduce((s,r)=>s+(r.output_tokens??0),0);
    const availRows = availRes.status==='fulfilled' ? (availRes.value.data??[]) : [];
    const confirmed = availRows.filter(r=>r.status==='confirmed').length;
    return res.status(200).json({ team,
      athleteCount: athRes.status==='fulfilled'?(athRes.value.count??0):0,
      parentCount:  parRes.status==='fulfilled'?(parRes.value.count??0):0,
      coachCount:   coachRes.status==='fulfilled'?(coachRes.value.count??0):0,
      eventCount30d: evtRes.status==='fulfilled'?(evtRes.value.count??0):0,
      messageCount30d: msgRes.status==='fulfilled'?(msgRes.value.count??0):0,
      aiCallsThisWeek: aiRows.length,
      avgTokensPerCall: aiRows.length ? Math.round((inp+out)/aiRows.length) : 0,
      estimatedCostUsd: Math.round(((inp/1e6)+(out*5/1e6))*10000)/10000,
      rsvpRate: availRows.length ? Math.round((confirmed/availRows.length)*100) : null,
    });
  }
  const ago14d = new Date(Date.now()-14*24*60*60*1000).toISOString();
  const { data: teams, error } = await supabase.from('teams').select('id,name,slug,active,plan_tier,created_at').order('created_at',{ascending:false});
  if (error) return res.status(500).json({ error: error.message });
  if (!teams?.length) return res.status(200).json({ teams: [] });
  const ids = teams.map(t=>t.id);
  const [athR,coachR,profR] = await Promise.allSettled([
    supabase.from('athletes').select('team_id').in('team_id',ids),
    supabase.from('coaches').select('team_id').in('team_id',ids),
    supabase.from('profiles').select('team_id,updated_at').in('team_id',ids).order('updated_at',{ascending:false}),
  ]);
  const athCounts={}, coachCounts={}, lastActive={};
  if(athR.status==='fulfilled'&&athR.value.data) for(const r of athR.value.data) athCounts[r.team_id]=(athCounts[r.team_id]??0)+1;
  if(coachR.status==='fulfilled'&&coachR.value.data) for(const r of coachR.value.data) coachCounts[r.team_id]=(coachCounts[r.team_id]??0)+1;
  if(profR.status==='fulfilled'&&profR.value.data) for(const r of profR.value.data) { if(!lastActive[r.team_id]) lastActive[r.team_id]=r.updated_at; }
  return res.status(200).json({ teams: teams.map(t=>({ ...t, athleteCount:athCounts[t.id]??0, coachCount:coachCounts[t.id]??0, lastActive:lastActive[t.id]??null, atRisk:!lastActive[t.id]||lastActive[t.id]<ago14d })) });
}

async function handleSupport(req, res, supabase, admin) {
  if (req.method === 'POST') {
    const { action, ticketId, message, answer } = req.body ?? {};
    if (!ticketId) return res.status(400).json({ error: 'ticketId required' });
    if (action==='reply') {
      const { data: t } = await supabase.from('support_tickets').select('conversation').eq('id',ticketId).single();
      const conv = t?.conversation ?? [];
      conv.push({ role:'agent', content:message.trim(), ts:new Date().toISOString(), agent_id:admin.userId });
      const { error } = await supabase.from('support_tickets').update({ conversation:conv, status:'in_progress', updated_at:new Date().toISOString() }).eq('id',ticketId);
      if(error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ ok: true });
    }
    if (action==='close') { await supabase.from('support_tickets').update({ status:'resolved', resolved_at:new Date().toISOString(), resolved_by:admin.userId, updated_at:new Date().toISOString() }).eq('id',ticketId); return res.status(200).json({ ok:true }); }
    if (action==='escalate') { await supabase.from('support_tickets').update({ status:'escalated', updated_at:new Date().toISOString() }).eq('id',ticketId); return res.status(200).json({ ok:true }); }
    if (action==='promote-kb') {
      const { data:t } = await supabase.from('support_tickets').select('subject,category').eq('id',ticketId).single();
      await supabase.from('knowledge_base').insert({ title:t?.subject??'Support resolution', content:answer.trim(), category:t?.category??'support', source_ticket_id:ticketId });
      return res.status(200).json({ ok:true });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }
  const ticketId = req.query?.id;
  if (ticketId) {
    const { data:ticket, error } = await supabase.from('support_tickets').select('*, profiles(full_name,email,role), teams(name,slug)').eq('id',ticketId).single();
    if(error) return res.status(404).json({ error: error.message });
    return res.status(200).json({ ticket: { ...ticket, tier:inferTier(ticket) } });
  }
  const ago7d = new Date(Date.now()-7*24*60*60*1000).toISOString();
  const [tRes,rRes] = await Promise.allSettled([
    supabase.from('support_tickets').select('*, profiles(full_name,email), teams(name,slug)').in('status',['open','in_progress','escalated']).order('created_at',{ascending:true}),
    supabase.from('support_tickets').select('status,created_at').gte('created_at',ago7d),
  ]);
  const tickets = (tRes.status==='fulfilled'?tRes.value.data??[]).map(t=>({...t,tier:inferTier(t)}));
  const recent  = rRes.status==='fulfilled' ? (rRes.value.data??[]) : [];
  const byTier  = {T1:0,T2:0,T3:0};
  for(const t of tickets) byTier[t.tier]=(byTier[t.tier]??0)+1;
  const aiRate = recent.length>0 ? Math.round((recent.filter(t=>t.status==='resolved').length/recent.length)*100) : null;
  const rTimes = tickets.filter(t=>t.updated_at&&t.updated_at!==t.created_at).map(t=>new Date(t.updated_at)-new Date(t.created_at)).sort((a,b)=>a-b);
  const medMin = rTimes.length ? Math.round(rTimes[Math.floor(rTimes.length/2)]/60000) : null;
  return res.status(200).json({ tickets, metrics:{ openTotal:tickets.length, byTier, aiResolutionRate:aiRate, medianResponseMin:medMin, oldestAgeHours:tickets[0]?Math.round((Date.now()-new Date(tickets[0].created_at))/3600000):null } });
}

async function handleAnalytics(req, res, supabase) {
  const now=new Date(), ago30d=new Date(now-30*24*60*60*1000).toISOString(), ago7d=new Date(now-7*24*60*60*1000).toISOString(), ago1d=new Date(now-1*24*60*60*1000).toISOString();
  const [aiR,featR,profR] = await Promise.allSettled([
    supabase.from('ai_call_log').select('created_at,input_tokens,output_tokens,cache_read_tokens,tool_calls,team_id').gte('created_at',ago30d).order('created_at',{ascending:true}),
    supabase.from('feature_events').select('feature,action,created_at,team_id').gte('created_at',ago30d),
    supabase.from('profiles').select('id,updated_at,team_id'),
  ]);
  const aiRows=aiR.status==='fulfilled'?(aiR.value.data??[]):[]; const featRows=featR.status==='fulfilled'?(featR.value.data??[]):[]; const profiles=profR.status==='fulfilled'?(profR.value.data??[]):[];
  const dau=new Set(profiles.filter(p=>p.updated_at>=ago1d).map(p=>p.id)).size;
  const mau=new Set(profiles.filter(p=>p.updated_at>=ago30d).map(p=>p.id)).size;
  const daily={};
  let tIn=0,tOut=0,tCache=0,tCalls=0;
  for(const r of aiRows){const d=r.created_at.slice(0,10);if(!daily[d])daily[d]={calls:0,inp:0,out:0};daily[d].calls++;daily[d].inp+=(r.input_tokens??0);daily[d].out+=(r.output_tokens??0);tIn+=(r.input_tokens??0);tOut+=(r.output_tokens??0);tCache+=(r.cache_read_tokens??0);tCalls++;}
  const sparkline=[];for(let i=29;i>=0;i--){const d=new Date(now-i*24*60*60*1000).toISOString().slice(0,10);const b=daily[d]??{calls:0,inp:0,out:0};sparkline.push({date:d,calls:b.calls,costUsd:(b.inp/1e6)+(b.out*5/1e6)});}
  const toolCounts={};for(const r of aiRows)if(Array.isArray(r.tool_calls))for(const t of r.tool_calls)toolCounts[t]=(toolCounts[t]??0)+1;
  const featCounts={};for(const r of featRows)featCounts[r.feature]=(featCounts[r.feature]??0)+1;
  const ai7d=aiRows.filter(r=>r.created_at>=ago7d);
  const i7=ai7d.reduce((s,r)=>s+(r.input_tokens??0),0),o7=ai7d.reduce((s,r)=>s+(r.output_tokens??0),0);
  return res.status(200).json({ dau, mau, dauMauRatio:mau>0?Math.round((dau/mau)*100):0,
    totalCalls30d:tCalls, calls7d:ai7d.length, cost7dUsd:Math.round(((i7/1e6)+(o7*5/1e6))*10000)/10000,
    cost30dUsd:Math.round(((tIn/1e6)+(tOut*5/1e6))*10000)/10000, cacheHitRate:tIn>0?Math.round((tCache/tIn)*100):null,
    aiSparkline:sparkline, toolBreakdown:Object.entries(toolCounts).sort((a,b)=>b[1]-a[1]).map(([tool,count])=>({tool,count})),
    featureBreakdown:Object.entries(featCounts).sort((a,b)=>b[1]-a[1]).map(([feature,count])=>({feature,count})) });
}

async function handleDev(req, res) {
  const [commitsR,issuesR,branchR,deploysR,qaR] = await Promise.allSettled([
    ghFetch('/commits?sha=main&per_page=10'),
    ghFetch('/issues?state=open&labels=bug&per_page=20'),
    ghFetch('/branches/main'),
    vercelFetch('/v6/deployments'),
    (async()=>{
      const files=await ghFetch('/contents/docs/qa/reports');
      if(!Array.isArray(files))return null;
      const reports=files.filter(f=>f.name.startsWith('report-')&&f.name.endsWith('.md')).sort((a,b)=>b.name.localeCompare(a.name));
      if(!reports.length)return null;
      const f=await ghFetch(`/contents/docs/qa/reports/${reports[0].name}`);
      if(!f?.content)return null;
      const c=Buffer.from(f.content,'base64').toString('utf-8');
      const dateM=reports[0].name.match(/report-(\d{4}-\d{2}-\d{2})/);
      return { filename:reports[0].name, date:dateM?.[1]??'unknown', passes:parseInt(c.match(/(\d+)\s*pass/)?.[1]??'0'), fails:parseInt(c.match(/(\d+)\s*fail/)?.[1]??'0'), warnings:parseInt(c.match(/(\d+)\s*warn/)?.[1]??'0'), preview:c.slice(0,600).replace(/^#[^\n]+\n/,'').trim() };
    })(),
  ]);
  const cd=commitsR.status==='fulfilled'?commitsR.value:null;
  const ghErr=cd?._error||cd?._missing?(cd._error??`Missing: ${cd._missing}`):null;
  const commits=Array.isArray(cd)?cd.slice(0,10).map(c=>({sha:c.sha?.slice(0,7),message:c.commit?.message?.split('\n')[0]??'',author:c.commit?.author?.name??'',date:c.commit?.author?.date??'',url:c.html_url??''})):[];
  const id=issuesR.status==='fulfilled'?issuesR.value:null;
  const issues=Array.isArray(id)?id.map(i=>({number:i.number,title:i.title,state:i.state,labels:i.labels?.map(l=>l.name)??[],created:i.created_at,url:i.html_url})):[];
  const bd=branchR.status==='fulfilled'?branchR.value:null;
  const dd=deploysR.status==='fulfilled'?deploysR.value:null;
  const vErr=dd?._error||dd?._missing?(dd._error??`Missing: ${dd._missing}`):null;
  const deploys=Array.isArray(dd?.deployments)?dd.deployments.slice(0,10).map(d=>({uid:d.uid,url:d.url?`https://${d.url}`:null,state:d.state,target:d.target,created:d.createdAt,meta:d.meta?.githubCommitMessage?.split('\n')[0]??''})):[];
  const qa=qaR.status==='fulfilled'?qaR.value:null;
  const repo=process.env.GITHUB_REPO||'jkusky218/MatMind';
  return res.status(200).json({ commits, issues, branchProtected:bd?.protected??null, requiresPR:bd?.protection?.required_pull_request_reviews!=null??null,
    deploys, lastDeploy:deploys[0]??null, qa, _debug:{githubError:ghErr,vercelError:vErr},
    flags:{hasOpenBugs:issues.filter(i=>i.labels.includes('bug')).length>0,lastDeployOk:deploys[0]?deploys[0].state==='READY':null,qaFailing:qa?qa.fails>0:null},
    links:{github:`https://github.com/${repo}`,vercel:'https://vercel.com/dashboard',issues:`https://github.com/${repo}/issues`,actions:`https://github.com/${repo}/actions`} });
}

// ── Main router ───────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const route = req.query?.route;

  let supabase;
  try {
    supabase = getServiceClient();
  } catch (err) {
    console.error('[ops] service client init failed:', err.message);
    return res.status(500).json({ error: `Server config error: ${err.message}` });
  }

  // Health endpoint is public (for uptime monitors) when no auth header present
  if (route === 'health' && !req.headers?.authorization) {
    return handleHealth(req, res, supabase);
  }

  const admin = await requireSuperAdmin(req, res);
  if (!admin) return;

  switch (route) {
    case 'overview':  return handleOverview(req, res, supabase);
    case 'health':    return handleHealth(req, res, supabase);
    case 'tenants':   return handleTenants(req, res, supabase, admin);
    case 'support':   return handleSupport(req, res, supabase, admin);
    case 'analytics': return handleAnalytics(req, res, supabase);
    case 'dev':       return handleDev(req, res);
    default:          return res.status(400).json({ error: `Unknown route: ${route}. Use ?route=overview|health|tenants|support|analytics|dev` });
  }
}
