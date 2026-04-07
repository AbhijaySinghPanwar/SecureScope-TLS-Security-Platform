/**
 * LoadingSpinner.jsx
 * Animated scanning indicator shown during TLS analysis.
 */
import React, { useEffect, useState } from 'react'

const messages = [
  'Initiating TLS handshake...',
  'Fetching SSL certificate...',
  'Analyzing cipher suites...',
  'Checking protocol versions...',
  'Detecting vulnerabilities...',
  'Computing security score...',
  'Generating report...',
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
    <div style={styles.overlay}>
      {/* Radar animation */}
      <div style={styles.radar}>
        <div style={styles.radarRing1} />
        <div style={styles.radarRing2} />
        <div style={styles.radarRing3} />
        <div style={styles.radarSweep} />
        <div style={styles.radarCenter}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 1L15.09 8.26L23 9.27L17.5 14.64L18.18 22.73L12 19.77L5.82 22.73L6.5 14.64L1 9.27L8.91 8.26L12 1Z"
              fill="#3d7fff" opacity="0.9" />
          </svg>
        </div>
      </div>

      <h2 style={styles.title}>Scanning {domainCount} domain{domainCount > 1 ? 's' : ''}...</h2>

      {/* Progress bar */}
      <div style={styles.progressTrack}>
        <div style={{ ...styles.progressBar, width: `${progress}%` }} />
        <div style={{ ...styles.progressGlow, width: `${progress}%` }} />
      </div>

      <p style={styles.message}>{messages[msgIdx]}</p>

      {/* Scrolling log lines */}
      <div style={styles.logBox}>
        {messages.slice(0, msgIdx + 1).reverse().map((m, i) => (
          <div key={i} style={{ ...styles.logLine, opacity: 1 - i * 0.18 }}>
            <span style={styles.logPrefix}>{'>'}</span> {m}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes radarSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes ringPulse {
          0%, 100% { opacity: 0.15; transform: scale(1); }
          50%       { opacity: 0.35; transform: scale(1.04); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>
    </div>
  )
}

const styles = {
  overlay: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '60px 40px', animation: 'fadeIn 0.4s ease',
  },
  radar: {
    position: 'relative', width: 160, height: 160,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 36,
  },
  radarRing1: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    border: '1px solid #3d7fff', opacity: 0.3,
    animation: 'ringPulse 2s ease-in-out infinite',
  },
  radarRing2: {
    position: 'absolute', inset: 24, borderRadius: '50%',
    border: '1px solid #3d7fff', opacity: 0.25,
    animation: 'ringPulse 2s ease-in-out infinite 0.4s',
  },
  radarRing3: {
    position: 'absolute', inset: 48, borderRadius: '50%',
    border: '1px solid #3d7fff', opacity: 0.2,
    animation: 'ringPulse 2s ease-in-out infinite 0.8s',
  },
  radarSweep: {
    position: 'absolute', inset: 0, borderRadius: '50%',
    background: 'conic-gradient(from 0deg, transparent 270deg, rgba(61,127,255,0.4) 360deg)',
    animation: 'radarSpin 2s linear infinite',
  },
  radarCenter: {
    width: 48, height: 48, borderRadius: '50%',
    background: 'rgba(61,127,255,0.15)',
    border: '1px solid rgba(61,127,255,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  title: {
    fontSize: 22, fontWeight: 600, color: '#e2e8f0', marginBottom: 24,
    fontFamily: "'Space Grotesk', sans-serif",
  },
  progressTrack: {
    position: 'relative', width: 380, maxWidth: '90vw', height: 6,
    background: '#1e2d50', borderRadius: 999, overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%', borderRadius: 999,
    background: 'linear-gradient(90deg, #3d7fff, #00d4ff)',
    transition: 'width 0.4s ease',
  },
  progressGlow: {
    position: 'absolute', top: 0, left: 0, height: '100%',
    background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.6), transparent)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    borderRadius: 999,
  },
  message: {
    color: '#00d4ff', fontSize: 13, fontFamily: "'JetBrains Mono', monospace",
    marginBottom: 24, height: 20,
  },
  logBox: {
    width: 380, maxWidth: '90vw', background: '#0a0e1a',
    border: '1px solid #1e2d50', borderRadius: 8,
    padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4,
    maxHeight: 140, overflow: 'hidden',
  },
  logLine: {
    fontSize: 12, fontFamily: "'JetBrains Mono', monospace",
    color: '#94a3b8', lineHeight: 1.5,
  },
  logPrefix: { color: '#3d7fff', marginRight: 6 },
}
