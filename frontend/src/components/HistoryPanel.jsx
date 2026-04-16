import React from 'react'
import { COLORS, SHADOWS, CLIP, FONT, TRANSITIONS } from '../theme.js'

function formatTimestamp(value) {
  if (!value) return 'Unknown time'
  return new Date(value).toLocaleString()
}

export default function HistoryPanel({ items, onScanAgain }) {
  return (
    <div style={s.card}>
      {/* Terminal header bar */}
      <div style={s.termHeader}>
        <span style={s.termDot(COLORS.destructive)} />
        <span style={s.termDot(COLORS.warn)} />
        <span style={s.termDot(COLORS.accent)} />
        <span style={s.termTitle}>scan_history.log</span>
      </div>

      <div style={s.body}>
        <div style={s.header}>
          <div>
            <p style={s.eyebrow}>// RECENT ACTIVITY</p>
            <h3 style={s.title}>SAVED SCAN HISTORY</h3>
          </div>
          <span style={s.count}>[{items.length} STORED]</span>
        </div>

        {items.length === 0 ? (
          <div style={s.empty}>
            <p style={s.emptyTitle}>&gt; NO_DATA_FOUND</p>
            <p style={s.emptyText}>Run your first scan to populate local history buffers.</p>
          </div>
        ) : (
          <div style={s.list}>
            {items.map((item) => (
              <div key={item.id} style={s.row}>
                <div style={s.meta}>
                  <div style={s.rowTop}>
                    <span style={s.time}>[ {formatTimestamp(item.created_at)} ]</span>
                    <span style={s.duration}>{item.scan_duration_seconds}s</span>
                  </div>
                  <div style={s.domains}>
                    {item.domains.slice(0, 3).join(', ')}
                    {item.domains.length > 3 ? ` +${item.domains.length - 3} more` : ''}
                  </div>
                  <div style={s.stats}>
                    <span style={s.statBadge}>
                      REACHABLE: <span style={{ color: COLORS.accent }}>{item.reachable_domains}/{item.total_domains}</span>
                    </span>
                    <span style={s.statBadge}>
                      AVG SCORE: <span style={{ color: COLORS.accent3 }}>{item.average_score ?? 'N/A'}</span>
                    </span>
                    <span style={s.statBadge}>
                      CRITICAL: <span style={{ color: item.critical_findings > 0 ? COLORS.destructive : COLORS.mutedFg }}>
                        {item.critical_findings}
                      </span>
                    </span>
                  </div>
                </div>

                <button
                  id={`rescan-btn-${item.id}`}
                  style={s.button}
                  onClick={() => onScanAgain(item.domains)}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = `${COLORS.accent3}15`
                    e.currentTarget.style.borderColor = COLORS.accent3
                    e.currentTarget.style.boxShadow = SHADOWS.neonTertiary
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.borderColor = COLORS.border
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  RESCAN //
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const s = {
  card: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  termHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: COLORS.card,
    borderBottom: `1px solid ${COLORS.border}`,
  },
  termDot: (color) => ({
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: color,
    boxShadow: `0 0 4px ${color}`,
    flexShrink: 0,
  }),
  termTitle: {
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.mutedFg,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  body: { padding: '24px 26px' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  eyebrow: {
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    marginBottom: 6,
  },
  title: {
    fontFamily: FONT.heading,
    fontSize: 18,
    color: COLORS.fg,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  count: {
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.accent3,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    paddingBottom: 2,
  },
  empty: {
    clipPath: CLIP.chamferSm,
    padding: '28px 24px',
    background: `${COLORS.accent}05`,
    border: `1px dashed ${COLORS.accent}40`,
    textAlign: 'center',
  },
  emptyTitle: {
    fontFamily: FONT.heading,
    fontSize: 15,
    color: COLORS.accent,
    fontWeight: 700,
    marginBottom: 8,
    letterSpacing: '0.1em',
  },
  emptyText: {
    fontFamily: FONT.body,
    fontSize: 13,
    color: COLORS.mutedFg,
    lineHeight: 1.7,
  },
  list: { display: 'flex', flexDirection: 'column', gap: 12 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    padding: '16px 20px',
    clipPath: CLIP.chamferSm,
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    alignItems: 'center',
    flexWrap: 'wrap',
    transition: TRANSITIONS.base,
  },
  meta: { flex: 1, minWidth: 260 },
  rowTop: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  time: {
    fontFamily: FONT.label,
    fontSize: 12,
    color: COLORS.accent3,
    letterSpacing: '0.1em',
  },
  duration: {
    fontFamily: FONT.label,
    fontSize: 10,
    color: COLORS.fg,
    background: `${COLORS.accent3}20`,
    border: `1px solid ${COLORS.accent3}40`,
    clipPath: CLIP.chamferXs,
    padding: '3px 8px',
    letterSpacing: '0.1em',
  },
  domains: {
    fontFamily: FONT.heading,
    fontSize: 14,
    color: COLORS.fg,
    fontWeight: 600,
    marginBottom: 10,
    wordBreak: 'break-word',
    letterSpacing: '0.05em',
  },
  stats: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.mutedFg,
    letterSpacing: '0.08em',
  },
  statBadge: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    padding: '4px 8px',
    clipPath: CLIP.chamferXs,
  },
  button: {
    fontFamily: FONT.label,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.15em',
    padding: '10px 18px',
    clipPath: CLIP.chamferSm,
    border: `1px solid ${COLORS.border}`,
    background: 'transparent',
    color: COLORS.accent3,
    cursor: 'pointer',
    transition: TRANSITIONS.fast,
  },
}
