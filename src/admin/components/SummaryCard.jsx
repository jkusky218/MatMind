// SummaryCard.jsx — reusable overview metric card for the CEO dashboard

const INDICATOR_COLORS = {
  green:  '#52C97C',
  amber:  '#C4A44A',
  red:    '#E05252',
  grey:   '#4A5568',
  unknown:'#4A5568',
};

/**
 * @param {string}  title      — section label (e.g. "System Health")
 * @param {string}  value      — primary metric text (e.g. "3 teams")
 * @param {string}  subtitle   — optional secondary line
 * @param {'green'|'amber'|'red'|'grey'|'unknown'} indicator
 * @param {string}  href       — navigate to this path on click
 * @param {boolean} loading    — show skeleton state
 * @param {string}  icon       — emoji icon
 */
export default function SummaryCard({
  title,
  value,
  subtitle,
  indicator = 'grey',
  href,
  loading = false,
  icon,
}) {
  const borderColor = INDICATOR_COLORS[indicator] ?? INDICATOR_COLORS.grey;

  function handleClick() {
    if (href) window.location.href = href;
  }

  return (
    <div
      onClick={handleClick}
      style={{
        background: '#0F2440',
        borderRadius: 12,
        borderLeft: `4px solid ${borderColor}`,
        padding: '20px 24px',
        cursor: href ? 'pointer' : 'default',
        transition: 'opacity 0.15s',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 110,
        userSelect: 'none',
      }}
      onMouseEnter={e => { if (href) e.currentTarget.style.opacity = '0.85'; }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: '#6BADE4',
        }}>
          {title}
        </span>
        {/* Status dot */}
        <span style={{
          marginLeft: 'auto',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: borderColor,
          flexShrink: 0,
        }} />
      </div>

      {/* Metric value */}
      {loading ? (
        <div style={{
          height: 28,
          width: '60%',
          borderRadius: 6,
          background: 'rgba(107,173,228,0.12)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <span style={{
          fontSize: 26,
          fontWeight: 700,
          color: '#FFFFFF',
          lineHeight: 1.1,
        }}>
          {value ?? '—'}
        </span>
      )}

      {/* Subtitle */}
      {subtitle && !loading && (
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
          {subtitle}
        </span>
      )}
    </div>
  );
}
