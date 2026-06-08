// OverviewPage.jsx — CEO Dashboard overview / mission control
// Shows one SummaryCard per section. Live data from /api/admin/?route=overview.

import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import SummaryCard from '../components/SummaryCard';

export default function OverviewPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Get the current session token to authenticate the admin API call.
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('No session — please log in again.');

        const res = await fetch('/api/admin/?route=overview', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }

        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // ── Derive card props from fetched data ─────────────────────────────────────

  function healthIndicator(status) {
    if (status === 'ok')       return 'green';
    if (status === 'degraded') return 'amber';
    if (status === 'down')     return 'red';
    return 'grey';
  }

  const tenantCount   = data?.tenantCount   ?? null;
  const openTickets   = data?.openTickets   ?? null;
  const aiCallsToday  = data?.aiCallsToday  ?? null;
  const healthStatus  = data?.lastHealth?.status ?? 'unknown';
  const healthLatency = data?.lastHealth?.latency_ms;

  return (
    <div style={{ padding: '32px 36px', maxWidth: 960 }}>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>
          Operations Overview
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>
          {new Date().toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          background: 'rgba(224,82,82,0.15)',
          border: '1px solid #E05252',
          borderRadius: 10,
          padding: '14px 18px',
          marginBottom: 24,
          color: '#E05252',
          fontSize: 13,
        }}>
          ⚠️ Could not load overview data: {error}
        </div>
      )}

      {/* Summary card grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
      }}>
        <SummaryCard
          icon="🟢"
          title="System Health"
          value={healthStatus === 'unknown' ? 'No data' : healthStatus.toUpperCase()}
          subtitle={healthLatency ? `${healthLatency} ms last check` : 'No checks logged yet'}
          indicator={healthIndicator(healthStatus)}
          href="/admin/health"
          loading={loading}
        />

        <SummaryCard
          icon="🏟️"
          title="Tenants"
          value={tenantCount !== null ? `${tenantCount} team${tenantCount !== 1 ? 's' : ''}` : null}
          subtitle="Active programs"
          indicator="green"
          href="/admin/tenants"
          loading={loading}
        />

        <SummaryCard
          icon="🤖"
          title="AI Usage"
          value={aiCallsToday !== null ? `${aiCallsToday} calls` : null}
          subtitle="Last 24 hours"
          indicator={aiCallsToday > 0 ? 'green' : 'grey'}
          href="/admin/analytics"
          loading={loading}
        />

        <SummaryCard
          icon="🎫"
          title="Support"
          value={openTickets !== null ? `${openTickets} open` : null}
          subtitle={openTickets === 0 ? 'All clear' : 'Tickets need attention'}
          indicator={openTickets > 0 ? 'amber' : 'green'}
          href="/admin/support"
          loading={loading}
        />

        <SummaryCard
          icon="🚀"
          title="Development"
          value="View deploys"
          subtitle="Sprint status & QA"
          indicator="green"
          href="/admin/dev"
          loading={false}
        />

        <SummaryCard
          icon="📣"
          title="Marketing"
          value="Coming soon"
          subtitle="Facebook funnel metrics"
          indicator="grey"
          href="/admin/marketing"
          loading={false}
        />
      </div>

      {/* Refresh hint */}
      <p style={{
        fontSize: 11,
        color: 'rgba(255,255,255,0.25)',
        marginTop: 28,
        textAlign: 'right',
      }}>
        Data loaded at {new Date().toLocaleTimeString()} — refresh to update
      </p>
    </div>
  );
}
