/**
 * LoadingSpinner.jsx
 * Animated scanning indicator shown during TLS analysis.
 * Cyberpunk terminal aesthetic with neon radar animation.
 */
import React, { useEffect, useState } from 'react'
import { COLORS, SHADOWS, CLIP, FONT } from '../theme.js'

const messages = [
  'INITIALIZING TLS HANDSHAKE...',
  'FETCHING SSL CERTIFICATE DATA...',
  'ANALYZING CIPHER SUITES...',
  'VERIFYING PROTOCOL VERSIONS...',
  'DETECTING KNOWN VULNERABILITIES...',
  'COMPUTING THREAT SCORE...',
  'GENERATING FINAL DOSSIER...',
]

export default function LoadingSpinner({ domainCount = 1 }) {
  const [msgIdx, setMsgIdx] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setMsgIdx(i => (i + 1) % messages.length)
    }, 900)
    const progTimer = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 8, 92))
    }, 400)
    return () => { clearInterval(msgTimer); clearInterval(progTimer) }
  }, [])

  return (
    <div style={s.overlay}>
      {/* Neon Radar Animation */}
      <div style={s.radar}>
        <div style={s.radarRing1} />
        <div style={s.radarRing2} />
        <div style={s.radarRing3} />
        <div style={s.radarSweep} />
        <div style={s.radarCenter}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 1L15.09 8.26L23 9.27L17.5 14.64L18.18 22.73L12 19.77L5.82 22.73L6.5 14.64L1 9.27L8.91 8.26L12 1Z"
              fill={COLORS.bg} stroke={COLORS.accent} strokeWidth="1" />
          </svg>
        </div>
      </div>

      <h2 style={s.title} className="cyber-glitch">
        SCANNING {domainCount} TARGET{domainCount > 1 ? 'S' : ''}...
      </h2>

      {/* Progress Bar */}
      <div style={s.progressTrack}>
        <div style={{ ...s.progressBar, width: `${progress}%` }} />
        <div style={{ ...s.progressGlow, width: `${progress}%` }} />
      </div>

      <p style={s.message}>
        <span style={s.blink}>_</span> {messages[msgIdx]}
      </p>

      {/* Terminal Log */}
      <div style={s.logBox}>
        <div style={s.logTermHeader}>
          <span style={{...s.dot, background: COLORS.destructive}} />
          <span style={{...s.dot, background: COLORS.warn}} />
          <span style={{...s.dot, background: COLORS.accent}} />
          <span style={s.logTermTitle}>sys_log</span>
        </div>

        {messages.slice(0, msgIdx + 1).reverse().map((m, i) => (
          <div key={i} style={{ ...s.logLine, opacity: 1 - i * 0.18 }}>
            <span style={s.logPrefix}>root@securescope:~#</span> {m}
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  overlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '60px 20px', animation: 'fadeIn 0.4s ease',
  },
  radar: {
    position: 'relative', width: 140, height: 140,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 40,
  },
  radarRing1: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: `1px solid ${COLORS.accent}`, opacity: 0.3,
    animation: 'ringPulse 2s ease-in-out infinite',
  },
  radarRing2: {
    position: 'absolute', inset: 20, borderRadius: '50%',
    border: `1px solid ${COLORS.accent}`, opacity: 0.25,
    animation: 'ringPulse 2s ease-in-out infinite 0.4s',
  },
  radarRing3: {
    position: 'absolute', inset: 40, borderRadius: '50%',
    border: `1px dashed ${COLORS.accent}`, opacity: 0.3,
    animation: 'radarSpin 10s linear infinite reverse',
  },
  radarSweep: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    background: `conic-gradient(from 0deg, transparent 270deg, ${COLORS.accent}60 360deg)`,
    animation: 'radarSpin 2s linear infinite',
  },
  radarCenter: {
    width: 40, height: 40, borderRadius: '50%',
    background: `${COLORS.accent}20`,
    border: `1px solid ${COLORS.accent}`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
    boxShadow: SHADOWS.neon,
  },
  title: {
    fontFamily: FONT.heading,
    fontSize: 20, fontWeight: 700, color: COLORS.fg, marginBottom: 24,
    letterSpacing: '0.12em', textTransform: 'uppercase',
  },
  progressTrack: {
    position: 'relative', width: 380, maxWidth: '90vw', height: 4,
    background: COLORS.border, marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    background: COLORS.accent,
    transition: 'width 0.4s ease',
    boxShadow: SHADOWS.neon,
  },
  progressGlow: {
    position: 'absolute', top: 0, left: 0, height: '100%',
    background: `linear-gradient(90deg, transparent, ${COLORS.accent3}80, transparent)`,
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  },
  message: {
    color: COLORS.accent, fontSize: 13, fontFamily: FONT.label,
    marginBottom: 28, height: 20, letterSpacing: '0.08em',
  },
  blink: { animation: 'blink 1s step-end infinite' },
  logBox: {
    width: 380, maxWidth: '90vw', background: COLORS.bg,
    border: `1px solid ${COLORS.accent}40`, clipPath: CLIP.chamferSm,
    padding: '8px 16px 16px', display: 'flex', flexDirection: 'column', gap: 6,
    maxHeight: 160, overflow: 'hidden', position: 'relative',
    boxShadow: `0 0 15px ${COLORS.accent}15 inset`,
  },
  logTermHeader: {
    display: 'flex', gap: 6, paddingBottom: 8,
    borderBottom: `1px solid ${COLORS.border}`, marginBottom: 4, alignItems: 'center',
  },
  logTermTitle: {
    fontSize: 9, color: COLORS.border, marginLeft: 6,
    fontFamily: FONT.label, letterSpacing: '0.1em',
  },
  dot: { width: 6, height: 6, borderRadius: '50%' },
  logLine: {
    fontSize: 11, fontFamily: FONT.body,
    color: COLORS.fg, lineHeight: 1.5,
  },
  logPrefix: { color: COLORS.mutedFg, marginRight: 8 },
}
