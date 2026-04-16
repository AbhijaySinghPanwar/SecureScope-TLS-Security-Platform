import React, { useEffect, useState } from 'react'
import HistoryPanel from '../components/HistoryPanel.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ValidatedDomainInput from '../components/ValidatedDomainInput.jsx'
import ScanResult from './ScanResult.jsx'
import ExportButton from '../components/ExportButton.jsx'
import { ScoreBarChart } from '../components/ComparisonChart.jsx'
import { checkHealth, getScanHistory, scanDomains } from '../services/api.js'
import { COLORS, SHADOWS, CLIP, FONT, TRANSITIONS } from '../theme.js'

export default function HomeDashboard() {
  const [state, setState] = useState('idle')
  const [results, setResults] = useState([])
  const [scanMeta, setScanMeta] = useState(null)
  const [globalError, setGlobalError] = useState('')
  const [apiOnline, setApiOnline] = useState(null)
  const [activeDomainIdx, setActiveDomainIdx] = useState(0)
  const [pendingDomains, setPendingDomains] = useState(0)
  const [historyItems, setHistoryItems] = useState([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState('')
  const [draftDomains, setDraftDomains] = useState('')

  useEffect(() => {
    checkHealth().then(setApiOnline)
    loadHistory()
  }, [])

  async function loadHistory() {
    setHistoryLoading(true)
    setHistoryError('')
    try {
      const data = await getScanHistory()
      setHistoryItems(data.items || [])
    } catch (err) {
      setHistoryError(err.message || 'Unable to load scan history.')
    } finally {
      setHistoryLoading(false)
    }
  }

  async function handleScan(domains) {
    setState('loading')
    setGlobalError('')
    setResults([])
    setScanMeta(null)
    setActiveDomainIdx(0)
    setPendingDomains(domains.length)
    try {
      const data = await scanDomains(domains)
      setResults(data.results)
      setScanMeta({ duration: data.scan_duration_seconds, total: data.total_domains })
      setState('results')
      setDraftDomains('')
      await loadHistory()
    } catch (err) {
      setGlobalError(err.message || 'Scan failed. Is the backend running on port 8000?')
      setState('error')
    } finally {
      setPendingDomains(0)
    }
  }

  function handleReset() {
    setState('idle')
    setResults([])
    setScanMeta(null)
    setGlobalError('')
    setActiveDomainIdx(0)
    setPendingDomains(0)
  }

  function handleScanAgain(domains) {
    setDraftDomains(domains.join('\n'))
    handleReset()
  }

  const reachable = results.filter((result) => result.reachable)
  const avgScore = reachable.length
    ? Math.round(reachable.reduce((sum, result) => sum + (result.score?.total_score ?? 0), 0) / reachable.length)
    : 0
  const totalVulns = reachable.reduce((sum, result) => sum + result.vulnerabilities.length, 0)
  const criticalCount = reachable.reduce(
    (sum, result) => sum + result.vulnerabilities.filter((item) => item.severity === 'CRITICAL').length,
    0,
  )

  return (
    <div style={s.page}>
      {/* ── Navigation ───────────────────────────────────────── */}
      <header style={s.nav}>
        <div style={s.navLogo}>
          {/* Chamfered shield logo mark */}
          <div style={s.logoMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill={COLORS.accent} opacity="0.9" />
              <path d="M9 12l2 2 4-4" stroke={COLORS.bg} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span style={s.logoText}>SecureScope</span>
            <span style={s.logoSub}> // TLS Security Platform</span>
          </div>
        </div>

        <div style={s.navRight}>
          {apiOnline !== null && (
            <div style={s.apiStatus}>
              <span
                style={{
                  ...s.statusDot,
                  background: apiOnline ? COLORS.accent : COLORS.destructive,
                  boxShadow: `0 0 6px ${apiOnline ? COLORS.accent : COLORS.destructive}`,
                  animation: apiOnline ? 'neonPulse 2s ease-in-out infinite' : 'none',
                }}
              />
              <span style={s.statusLabel}>
                API <span style={{ color: apiOnline ? COLORS.accent : COLORS.destructive }}>
                  {apiOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </span>
            </div>
          )}
          {state === 'results' && (
            <button
              id="new-scan-btn"
              style={s.newScanBtn}
              onClick={handleReset}
              onMouseEnter={e => {
                e.currentTarget.style.background = COLORS.accent
                e.currentTarget.style.color = COLORS.bg
                e.currentTarget.style.boxShadow = SHADOWS.neon
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = COLORS.accent
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              + NEW SCAN
            </button>
          )}
        </div>
      </header>

      <main style={s.main}>
        {/* ── Idle / Hero ─────────────────────────────────────── */}
        {state === 'idle' && (
          <div style={s.hero}>
            {/* Circuit grid background */}
            <div style={s.heroCircuit} />
            {/* Ambient glow */}
            <div style={s.heroGlow} />

            <div style={s.heroText}>
              {/* Eyebrow */}
              <p style={s.heroEyebrow}>
                <span style={s.blinkCursor}>{'>'}</span> INITIALIZING SECURITY SCAN...
              </p>

              {/* Glitched H1 */}
              <h1 style={s.heroTitle} className="cyber-glitch">
                TLS THREAT
                <br />
                <span style={s.heroAccent}>ANALYSIS</span>
              </h1>

              <p style={s.heroSub}>
                Reveal SSL vulnerabilities, inspect cipher suites, decode certificate data —
                and receive a <span style={{ color: COLORS.accent }}>military-grade security score</span> in seconds.
              </p>

              {/* Feature pills — chamfered badges */}
              <div style={s.pills}>
                {[
                  { label: 'Certificate Validity', icon: '◈' },
                  { label: 'TLS Protocol Check', icon: '◈' },
                  { label: 'Vulnerability Detection', icon: '◈' },
                  { label: 'Security Score', icon: '◈' },
                ].map(({ label, icon }) => (
                  <span key={label} style={s.pill}>
                    <span style={{ color: COLORS.accent, marginRight: 6 }}>{icon}</span>{label}
                  </span>
                ))}
              </div>
            </div>

            <ValidatedDomainInput
              key={draftDomains || 'empty'}
              onScan={handleScan}
              isLoading={false}
              initialValue={draftDomains}
            />

            <div style={s.historyWrap}>
              <HistoryPanel items={historyItems} onScanAgain={handleScanAgain} />
              {historyLoading && <p style={s.historyNote}><span>{'>'}</span> Loading scan history...</p>}
              {historyError && <p style={s.historyError}><span>{'>'}</span> ERROR: {historyError}</p>}
            </div>
          </div>
        )}

        {/* ── Loading ──────────────────────────────────────────── */}
        {state === 'loading' && <LoadingSpinner domainCount={pendingDomains || 1} />}

        {/* ── Error ────────────────────────────────────────────── */}
        {state === 'error' && (
          <div style={s.errorBox}>
            <p style={s.errorTitle}>// SCAN FAILED</p>
            <p style={s.errorMsg}>{globalError}</p>
            <div style={s.errorCode}>
              <span style={s.errorPrompt}>$</span>
              <span> cd backend &amp;&amp; python run.py</span>
            </div>
            <button
              id="retry-btn"
              style={s.retryBtn}
              onClick={handleReset}
              onMouseEnter={e => {
                e.currentTarget.style.background = COLORS.destructive
                e.currentTarget.style.color = COLORS.bg
                e.currentTarget.style.boxShadow = SHADOWS.neonDestructive
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = COLORS.destructive
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              RETRY
            </button>
          </div>
        )}

        {/* ── Results ──────────────────────────────────────────── */}
        {state === 'results' && results.length > 0 && (
          <div style={s.resultsWrap}>
            {/* Summary bar */}
            <div style={s.summaryBar}>
              <div style={s.summaryLeft}>
                <p style={s.summaryEyebrow}>// SCAN COMPLETE</p>
                <h2 style={s.summaryTitle}>
                  {scanMeta?.total} DOMAIN{scanMeta?.total > 1 ? 'S' : ''} ANALYZED
                </h2>
                <p style={s.summaryMeta}>Duration: {scanMeta?.duration}s</p>
              </div>
              <div style={s.summaryStats}>
                <div style={s.stat}>
                  <span style={{ ...s.statVal, color: COLORS.accent }}>{avgScore}</span>
                  <span style={s.statLabel}>AVG SCORE</span>
                </div>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={{ ...s.statVal, color: totalVulns > 0 ? COLORS.warn : COLORS.accent }}>
                    {totalVulns}
                  </span>
                  <span style={s.statLabel}>TOTAL ISSUES</span>
                </div>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={{ ...s.statVal, color: criticalCount > 0 ? COLORS.destructive : COLORS.accent }}>
                    {criticalCount}
                  </span>
                  <span style={s.statLabel}>CRITICAL</span>
                </div>
              </div>
              <ExportButton results={results} />
            </div>

            {/* Comparison chart */}
            {results.length > 1 && (
              <div style={s.chartSection}>
                <ScoreBarChart results={results} />
              </div>
            )}

            {/* Domain tabs */}
            {results.length > 1 && (
              <div style={s.domainTabs}>
                {results.map((result, index) => {
                  const gradeColor = result.score?.grade_color || COLORS.mutedFg
                  const isActive = index === activeDomainIdx
                  return (
                    <button
                      key={result.domain}
                      id={`domain-tab-${index}`}
                      style={{
                        ...s.domainTab,
                        ...(isActive ? {
                          borderColor: gradeColor,
                          color: gradeColor,
                          boxShadow: `0 0 8px ${gradeColor}60`,
                          background: `${gradeColor}10`,
                        } : {}),
                      }}
                      onClick={() => setActiveDomainIdx(index)}
                    >
                      <span style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: gradeColor,
                        marginRight: 6,
                      }}>
                        [{result.reachable ? (result.score?.grade ?? '?') : '!'}]
                      </span>
                      <span style={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.domain}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            <ScanResult result={results[activeDomainIdx]} />
          </div>
        )}
      </main>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer style={s.footer}>
        <span style={{ color: COLORS.accent }}>{'>'}</span>
        <span>SecureScope v1.0</span>
        <span style={{ color: COLORS.border }}>|</span>
        <span>Backend: FastAPI + Python ssl</span>
        <span style={{ color: COLORS.border }}>|</span>
        <span>Frontend: React + Chart.js</span>
        <span style={{ color: COLORS.accent, animation: 'blink 1s step-end infinite' }}>_</span>
      </footer>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: COLORS.bg,
    position: 'relative',
  },

  // ── Nav ──
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: 60,
    borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.card,
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(8px)',
    boxShadow: `0 1px 0 ${COLORS.accent}20`,
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 36,
    height: 36,
    clipPath: CLIP.chamferSm,
    background: `${COLORS.accent}15`,
    border: `1px solid ${COLORS.accent}40`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: FONT.heading,
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.accent,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    textShadow: `0 0 10px ${COLORS.accent}80`,
  },
  logoSub: {
    fontFamily: FONT.body,
    fontSize: 11,
    color: COLORS.mutedFg,
    letterSpacing: '0.05em',
  },
  navRight: { display: 'flex', alignItems: 'center', gap: 20 },
  apiStatus: { display: 'flex', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  statusLabel: {
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: '0.1em',
  },
  newScanBtn: {
    fontFamily: FONT.label,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '8px 18px',
    clipPath: CLIP.chamferSm,
    border: `2px solid ${COLORS.accent}`,
    background: 'transparent',
    color: COLORS.accent,
    cursor: 'pointer',
    transition: TRANSITIONS.base,
  },

  // ── Hero ──
  hero: {
    display: 'flex',
    flexDirection: 'column',
    gap: 36,
    position: 'relative',
    paddingTop: 8,
  },
  heroCircuit: {
    position: 'absolute',
    top: -60,
    left: 0,
    right: 0,
    height: 340,
    backgroundImage: [
      'linear-gradient(rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
      'linear-gradient(90deg, rgba(0, 255, 136, 0.03) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: '50px 50px',
    pointerEvents: 'none',
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 700,
    height: 500,
    borderRadius: '50%',
    background: `radial-gradient(ellipse, ${COLORS.accent}08 0%, transparent 65%)`,
    animation: 'heroGlow 6s ease-in-out infinite',
    pointerEvents: 'none',
  },
  heroText: { textAlign: 'center', position: 'relative', paddingTop: 32 },
  heroEyebrow: {
    fontFamily: FONT.label,
    fontSize: 12,
    color: COLORS.accent,
    letterSpacing: '0.2em',
    textTransform: 'uppercase',
    marginBottom: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  blinkCursor: {
    animation: 'blink 1s step-end infinite',
    color: COLORS.accent,
  },
  heroTitle: {
    fontFamily: FONT.heading,
    fontSize: 'clamp(40px, 8vw, 80px)',
    fontWeight: 900,
    color: COLORS.fg,
    lineHeight: 1.05,
    marginBottom: 20,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    textShadow: `-2px 0 ${COLORS.accent2}, 2px 0 ${COLORS.accent3}, 0 0 20px ${COLORS.accent}50`,
  },
  heroAccent: {
    color: COLORS.accent,
    textShadow: `0 0 20px ${COLORS.accent}80, 0 0 40px ${COLORS.accent}40`,
  },
  heroSub: {
    fontFamily: FONT.body,
    fontSize: 'clamp(13px, 1.5vw, 16px)',
    color: COLORS.mutedFg,
    maxWidth: 620,
    margin: '0 auto 28px',
    lineHeight: 1.8,
    letterSpacing: '0.03em',
  },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  pill: {
    background: `${COLORS.accent}08`,
    border: `1px solid ${COLORS.accent}30`,
    clipPath: CLIP.chamferXs,
    padding: '6px 14px',
    fontSize: 11,
    fontFamily: FONT.label,
    color: COLORS.fg,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },

  // ── History ──
  historyWrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  historyNote: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: COLORS.accent,
    textAlign: 'center',
    letterSpacing: '0.05em',
  },
  historyError: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: COLORS.destructive,
    textAlign: 'center',
  },

  // ── Error state ──
  errorBox: {
    maxWidth: 520,
    margin: '60px auto',
    textAlign: 'center',
    background: `${COLORS.destructive}08`,
    border: `1px solid ${COLORS.destructive}40`,
    clipPath: CLIP.chamfer,
    padding: '40px 32px',
    animation: 'fadeIn 0.4s ease',
  },
  errorTitle: {
    fontFamily: FONT.heading,
    fontSize: 18,
    fontWeight: 700,
    color: COLORS.destructive,
    marginBottom: 14,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    textShadow: SHADOWS.neonDestructive,
  },
  errorMsg: {
    fontFamily: FONT.body,
    color: COLORS.fg,
    fontSize: 14,
    lineHeight: 1.7,
    marginBottom: 20,
  },
  errorCode: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    padding: '10px 16px',
    fontFamily: FONT.body,
    fontSize: 13,
    color: COLORS.fg,
    marginBottom: 24,
    textAlign: 'left',
    display: 'flex',
    gap: 10,
  },
  errorPrompt: { color: COLORS.accent },
  retryBtn: {
    fontFamily: FONT.label,
    fontSize: 12,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    padding: '10px 28px',
    clipPath: CLIP.chamferSm,
    border: `2px solid ${COLORS.destructive}`,
    background: 'transparent',
    color: COLORS.destructive,
    cursor: 'pointer',
    transition: TRANSITIONS.base,
  },

  // ── Results ──
  resultsWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    animation: 'fadeIn 0.4s ease',
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    padding: '20px 28px',
    flexWrap: 'wrap',
    boxShadow: `inset 0 1px 0 ${COLORS.accent}15`,
  },
  summaryLeft: { flex: 1 },
  summaryEyebrow: {
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.accent,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  summaryTitle: {
    fontFamily: FONT.heading,
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.fg,
    letterSpacing: '0.08em',
    marginBottom: 4,
  },
  summaryMeta: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: COLORS.mutedFg,
    letterSpacing: '0.05em',
  },
  summaryStats: { display: 'flex', alignItems: 'center', gap: 16 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  statVal: {
    fontFamily: FONT.heading,
    fontSize: 28,
    fontWeight: 900,
    lineHeight: 1,
  },
  statLabel: {
    fontFamily: FONT.label,
    fontSize: 10,
    color: COLORS.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
  },
  statDivider: { width: 1, height: 40, background: COLORS.border },
  chartSection: {},

  domainTabs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  domainTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 14px',
    clipPath: CLIP.chamferSm,
    border: `1px solid ${COLORS.border}`,
    background: COLORS.card,
    color: COLORS.mutedFg,
    cursor: 'pointer',
    fontFamily: FONT.body,
    fontSize: 12,
    transition: TRANSITIONS.base,
  },

  // ── Footer ──
  footer: {
    padding: '14px 32px',
    borderTop: `1px solid ${COLORS.border}`,
    display: 'flex',
    gap: 10,
    fontFamily: FONT.label,
    fontSize: 11,
    color: COLORS.mutedFg,
    justifyContent: 'center',
    alignItems: 'center',
    letterSpacing: '0.08em',
    background: COLORS.card,
  },

  // ── Main ──
  main: {
    flex: 1,
    padding: '32px 24px',
    maxWidth: 1100,
    margin: '0 auto',
    width: '100%',
  },
}
