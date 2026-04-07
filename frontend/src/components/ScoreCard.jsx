/**
 * ScoreCard.jsx
 * Displays the security grade badge, numeric score, and per-category breakdown.
 */
import React, { useEffect, useState } from 'react'

/* Maps grade to ring color */
const GRADE_COLORS = {
  'A+': '#00C853', 'A': '#00E676', 'B': '#FFEB3B',
  'C': '#FF9800', 'D': '#FF5722', 'F': '#F44336',
}

/* Animated numeric counter */
function Counter({ target, duration = 1200 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3) // ease-out cubic
      setVal(Math.round(eased * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <>{val}</>
}

/* Single breakdown row */
function BreakdownRow({ label, score, max }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 80 ? '#00e676' : pct >= 50 ? '#ffab40' : '#ff5252'
  return (
    <div style={s.row}>
      <div style={s.rowTop}>
        <span style={s.rowLabel}>{label}</span>
        <span style={{ ...s.rowScore, color }}>{score}/{max}</span>
      </div>
      <div style={s.track}>
        <div
          style={{ ...s.fill, width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}55` }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ score, domain }) {
  if (!score) return null

  const gradeColor = GRADE_COLORS[score.grade] || '#94a3b8'
  const circumference = 2 * Math.PI * 52 // r=52
  const offset = circumference * (1 - score.total_score / 100)

  return (
    <div style={s.card}>
      <p style={s.domainLabel}>{domain}</p>

      {/* Grade ring */}
      <div style={s.ringWrap}>
        <svg width="140" height="140" style={s.svg}>
          {/* Background track */}
          <circle cx="70" cy="70" r="52" fill="none" stroke="#1e2d50" strokeWidth="8" />
          {/* Score arc */}
          <circle
            cx="70" cy="70" r="52" fill="none"
            stroke={gradeColor} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)', filter: `drop-shadow(0 0 6px ${gradeColor})` }}
          />
        </svg>

        {/* Center text */}
        <div style={s.ringCenter}>
          <div style={{ ...s.scoreNum, color: gradeColor }}>
            <Counter target={score.total_score} />
          </div>
          <div style={s.outOf}>/100</div>
        </div>
      </div>

      {/* Grade badge */}
      <div style={{ ...s.grade, background: `${gradeColor}20`, border: `2px solid ${gradeColor}`, color: gradeColor }}>
        {score.grade}
      </div>

      {/* Summary */}
      <p style={s.summary}>{score.summary}</p>

      {/* Breakdown */}
      <div style={s.breakdown}>
        <p style={s.breakdownTitle}>Score Breakdown</p>
        {Object.values(score.breakdown).map(item => (
          <BreakdownRow key={item.label} label={item.label} score={item.score} max={item.max} />
        ))}
      </div>
    </div>
  )
}

const s = {
  card: {
    background: '#0f1629', border: '1px solid #1e2d50', borderRadius: 16,
    padding: '28px 24px', display: 'flex', flexDirection: 'column',
    alignItems: 'center', animation: 'fadeIn 0.5s ease',
  },
  domainLabel: {
    fontSize: 14, color: '#d4e0f5', fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 16, textAlign: 'center', wordBreak: 'break-all',
  },
  ringWrap: { position: 'relative', width: 140, height: 140, marginBottom: 16 },
  svg: { position: 'absolute', inset: 0 },
  ringCenter: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 32, fontWeight: 700, lineHeight: 1, fontFamily: "'JetBrains Mono', monospace" },
  outOf: { fontSize: 13, color: '#c1d0ea', fontFamily: "'JetBrains Mono', monospace" },
  grade: {
    fontSize: 28, fontWeight: 700, borderRadius: 10, padding: '4px 20px',
    marginBottom: 12, fontFamily: "'Space Grotesk', sans-serif",
  },
  summary: { fontSize: 14, color: '#e6eefc', textAlign: 'center', marginBottom: 24, maxWidth: 280, lineHeight: 1.6 },
  breakdown: { width: '100%' },
  breakdownTitle: { fontSize: 12, color: '#c1d0ea', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 },
  row: { marginBottom: 12 },
  rowTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 4 },
  rowLabel: { fontSize: 13, color: '#d6e2f7' },
  rowScore: { fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 },
  track: { height: 4, background: '#1e2d50', borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999, transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)' },
}
