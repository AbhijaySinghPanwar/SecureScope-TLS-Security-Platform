import React from 'react'

function formatTimestamp(value) {
  if (!value) return 'Unknown time'
  return new Date(value).toLocaleString()
}

export default function HistoryPanel({ items, onScanAgain }) {
  return (
    <div style={s.card}>
      <div style={s.header}>
        <div>
          <p style={s.eyebrow}>Recent Activity</p>
          <h3 style={s.title}>Saved Scan History</h3>
        </div>
        <span style={s.count}>{items.length} stored</span>
      </div>

      {items.length === 0 ? (
        <div style={s.empty}>
          <p style={s.emptyTitle}>No saved scans yet</p>
          <p style={s.emptyText}>Run your first scan and it will show up here for quick re-checks.</p>
        </div>
      ) : (
        <div style={s.list}>
          {items.map((item) => (
            <div key={item.id} style={s.row}>
              <div style={s.meta}>
                <div style={s.rowTop}>
                  <span style={s.time}>{formatTimestamp(item.created_at)}</span>
                  <span style={s.duration}>{item.scan_duration_seconds}s</span>
                </div>
                <div style={s.domains}>
                  {item.domains.slice(0, 3).join(', ')}
                  {item.domains.length > 3 ? ` +${item.domains.length - 3} more` : ''}
                </div>
                <div style={s.stats}>
                  <span>Reachable {item.reachable_domains}/{item.total_domains}</span>
                  <span>Avg score {item.average_score ?? 'N/A'}</span>
                  <span>Critical {item.critical_findings}</span>
                </div>
              </div>

              <button style={s.button} onClick={() => onScanAgain(item.domains)}>
                Scan Again
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const s = {
  card: {
    background: '#121a2f',
    border: '1px solid #28406f',
    borderRadius: 16,
    padding: '24px 26px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 18,
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontSize: 12,
    color: '#c4d2ec',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 4,
  },
  title: { fontSize: 22, color: '#f4f7ff', fontWeight: 700 },
  count: {
    borderRadius: 999,
    padding: '5px 12px',
    background: 'rgba(61,127,255,0.12)',
    color: '#7fb0ff',
    fontSize: 12,
    border: '1px solid rgba(61,127,255,0.25)',
  },
  empty: {
    borderRadius: 12,
    padding: '22px 20px',
    background: '#0a1020',
    border: '1px dashed #22345f',
  },
  emptyTitle: { fontSize: 16, color: '#f4f7ff', fontWeight: 700, marginBottom: 6 },
  emptyText: { fontSize: 14, color: '#c1d0ea', lineHeight: 1.7 },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    padding: '16px 18px',
    borderRadius: 12,
    background: '#0a1020',
    border: '1px solid #28406f',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  meta: { flex: 1, minWidth: 240 },
  rowTop: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  time: { fontSize: 13, color: '#d2def4', fontFamily: "'JetBrains Mono', monospace" },
  duration: {
    fontSize: 12,
    color: '#b5ecff',
    background: 'rgba(64,196,255,0.08)',
    padding: '3px 8px',
    borderRadius: 999,
  },
  domains: {
    fontSize: 15,
    color: '#f2f6ff',
    fontWeight: 500,
    marginBottom: 8,
    wordBreak: 'break-word',
  },
  stats: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
    fontSize: 13,
    color: '#c1d0ea',
  },
  button: {
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid rgba(61,127,255,0.35)',
    background: 'rgba(61,127,255,0.1)',
    color: '#dce9ff',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
  },
}
