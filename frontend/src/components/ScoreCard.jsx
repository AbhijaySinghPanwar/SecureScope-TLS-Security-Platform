/**
 * ScoreCard.jsx
 * Displays the security grade badge, numeric score, and per-category breakdown.
 * Cyberpunk redesign — neon ring, Orbitron score, chamfered grade badge, glowing bars.
 */
import React, { useEffect, useState } from 'react'
import { COLORS, SHADOWS, CLIP, FONT } from '../theme.js'

const GRADE_COLORS = {
  'A+': '#00C853', 'A': '#00E676', 'B': '#FFEB3B',
  'C': '#FF9800', 'D': '#FF5722', 'F': '#F44336',
}

function Counter({ target, duration = 1200 }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(eased * target))
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [target, duration])
  return <>{val}</>
}

function BreakdownRow({ label, score, max }) {
  const pct = Math.round((score / max) * 100)
  const color = pct >= 80 ? COLORS.accent : pct >= 50 ? COLORS.warn : COLORS.destructive
  return (
    <div style={s.row}>
      <div style={s.rowTop}>
        <span style={s.rowLabel}>{label}</span>
        <span style={{ ...s.rowScore, color }}>{score}/{max}</span>
      </div>
      <div style={s.track}>
        <div
          style={{
            ...s.fill,
            width: `${pct}%`,
            background: color,
            boxShadow: `0 0 6px ${color}60`,
          }}
        />
      </div>
    </div>
  )
}

export default function ScoreCard({ score, domain }) {
  if (!score) return null

  const gradeColor = GRADE_COLORS[score.grade] || COLORS.mutedFg
  const circumference = 2 * Math.PI * 52
  const offset = circumference * (1 - score.total_score / 100)

  return (
    <div style={s.card}>
      {/* Domain label */}
      <p style={s.domainLabel}>{domain}</p>

      {/* Grade ring */}
      <div style={s.ringWrap}>
        {/* Decorative outer ring */}
        <div style={s.ringOuter} />
        <svg width="140" height="140" style={s.svg}>
          {/* Track */}
          <circle cx="70" cy="70" r="52" fill="none" stroke={COLORS.border} strokeWidth="6" />
          {/* Score arc */}
          <circle
            cx="70" cy="70" r="52" fill="none"
            stroke={gradeColor} strokeWidth="6"
            strokeLinecap="square"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            transform="rotate(-90 70 70)"
            style={{
              transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)',
              filter: `drop-shadow(0 0 6px ${gradeColor}) drop-shadow(0 0 12px ${gradeColor}60)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div style={s.ringCenter}>
          <div style={{ ...s.scoreNum, color: gradeColor, textShadow: `0 0 20px ${gradeColor}80` }}>
            <Counter target={score.total_score} />
          </div>
          <div style={s.outOf}>/100</div>
        </div>
      </div>

      {/* Grade badge */}
      <div style={{
        ...s.grade,
        background: `${gradeColor}15`,
        border: `2px solid ${gradeColor}`,
        color: gradeColor,
        boxShadow: `0 0 10px ${gradeColor}50, inset 0 0 10px ${gradeColor}10`,
      }}>
        {score.grade}
      </div>

      {/* Summary */}
      <p style={s.summary}>{score.summary}</p>

      {/* Breakdown */}
      <div style={s.breakdown}>
        <p style={s.breakdownTitle}>// SCORE BREAKDOWN</p>
        {Object.values(score.breakdown).map(item => (
          <BreakdownRow key={item.label} label={item.label} score={item.score} max={item.max} />
        ))}
      </div>
    </div>
  )
}

const s = {
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    padding: '24px 20px',
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', animation: 'fadeIn 0.5s ease',
  },
  domainLabel: {
    fontFamily: FONT.label, fontSize: 11, color: COLORS.accent3,
    marginBottom: 16, textAlign: 'center', wordBreak: 'break-all',
    letterSpacing: '0.08em', textTransform: 'uppercase',
  },
  ringWrap: { position: 'relative', width: 140, height: 140, marginBottom: 16 },
  ringOuter: {
    position: 'absolute', inset: -4, borderRadius: '50%',
    border: `1px solid ${COLORS.border}`,
    animation: 'ringPulse 3s ease-in-out infinite',
  },
  svg: { position: 'absolute', inset: 0 },
  ringCenter: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: {
    fontFamily: FONT.heading,
    fontSize: 36, fontWeight: 900, lineHeight: 1,
  },
  outOf: {
    fontFamily: FONT.label, fontSize: 12, color: COLORS.mutedFg,
    letterSpacing: '0.08em',
  },
  grade: {
    fontFamily: FONT.heading,
    fontSize: 26, fontWeight: 900,
    clipPath: CLIP.chamferSm,
    padding: '5px 22px', marginBottom: 14,
    letterSpacing: '0.1em',
  },
  summary: {
    fontFamily: FONT.body, fontSize: 12, color: COLORS.mutedFg,
    textAlign: 'center', marginBottom: 24,
    maxWidth: 260, lineHeight: 1.7, letterSpacing: '0.03em',
  },
  breakdown: { width: '100%' },
  breakdownTitle: {
    fontFamily: FONT.label, fontSize: 10, color: COLORS.accent,
    textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14,
  },
  row: { marginBottom: 14 },
  rowTop: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  rowLabel: { fontFamily: FONT.body, fontSize: 11, color: COLORS.fg },
  rowScore: { fontFamily: FONT.label, fontSize: 11, fontWeight: 700, letterSpacing: '0.05em' },
  track: {
    height: 3, background: COLORS.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', transition: 'width 1s cubic-bezier(0.34,1.56,0.64,1)' },
}
