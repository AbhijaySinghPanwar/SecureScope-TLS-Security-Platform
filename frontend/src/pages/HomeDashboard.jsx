import React, { useEffect, useState } from 'react'
import HistoryPanel from '../components/HistoryPanel.jsx'
import LoadingSpinner from '../components/LoadingSpinner.jsx'
import ValidatedDomainInput from '../components/ValidatedDomainInput.jsx'
import ScanResult from './ScanResult.jsx'
import ExportButton from '../components/ExportButton.jsx'
import { ScoreBarChart } from '../components/ComparisonChart.jsx'
import { checkHealth, getScanHistory, scanDomains } from '../services/api.js'

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
      <header style={s.nav}>
        <div style={s.navLogo}>
          <div style={s.logoMark}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" fill="#3d7fff" opacity="0.9" />
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <span style={s.logoText}>SecureScope</span>
            <span style={s.logoSub}> TLS Security Platform</span>
          </div>
        </div>

        <div style={s.navRight}>
          {apiOnline !== null && (
            <div style={s.apiStatus}>
              <span
                style={{
                  ...s.statusDot,
                  background: apiOnline ? '#00e676' : '#ff5252',
                  boxShadow: `0 0 6px ${apiOnline ? '#00e676' : '#ff5252'}`,
                }}
              />
              <span style={{ fontSize: 13, color: '#c4d2ee', fontWeight: 500 }}>API {apiOnline ? 'Online' : 'Offline'}</span>
            </div>
          )}
          {state === 'results' && (
            <button style={s.newScanBtn} onClick={handleReset}>+ New Scan</button>
          )}
        </div>
      </header>

      <main style={s.main}>
        {state === 'idle' && (
          <div style={s.hero}>
            <div style={s.heroGlow} />
            <div style={s.heroText}>
              <h1 style={s.heroTitle}>
                TLS Security Analysis
                <span style={s.heroAccent}> at a Glance</span>
              </h1>
              <p style={s.heroSub}>
                Analyze SSL certificates, detect weak ciphers, identify vulnerabilities,
                and get an actionable security score instantly.
              </p>
              <div style={s.pills}>
                {['Certificate Validity', 'TLS Protocol Check', 'Vulnerability Detection', 'Security Score'].map((pill) => (
                  <span key={pill} style={s.pill}>{pill}</span>
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
              {historyLoading && <p style={s.historyNote}>Loading saved scan history...</p>}
              {historyError && <p style={s.historyError}>{historyError}</p>}
            </div>
          </div>
        )}

        {state === 'loading' && <LoadingSpinner domainCount={pendingDomains || 1} />}

        {state === 'error' && (
          <div style={s.errorBox}>
            <p style={s.errorTitle}>Scan Failed</p>
            <p style={s.errorMsg}>{globalError}</p>
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: '#0a0e1a',
                borderRadius: 8,
                fontSize: 13,
                color: '#c4d2ee',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              Make sure the backend is running:
              <br />
              <span style={{ color: '#3d7fff' }}>cd backend && python run.py</span>
            </div>
            <button style={s.retryBtn} onClick={handleReset}>Try Again</button>
          </div>
        )}

        {state === 'results' && results.length > 0 && (
          <div style={s.resultsWrap}>
            <div style={s.summaryBar}>
              <div style={s.summaryLeft}>
                <h2 style={s.summaryTitle}>Scan Complete</h2>
                <p style={s.summaryMeta}>
                  {scanMeta?.total} domain{scanMeta?.total > 1 ? 's' : ''} analyzed in {scanMeta?.duration}s
                </p>
              </div>
              <div style={s.summaryStats}>
                <div style={s.stat}>
                  <span style={s.statVal}>{avgScore}</span>
                  <span style={s.statLabel}>Avg Score</span>
                </div>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={{ ...s.statVal, color: totalVulns > 0 ? '#ffab40' : '#00e676' }}>{totalVulns}</span>
                  <span style={s.statLabel}>Total Issues</span>
                </div>
                <div style={s.statDivider} />
                <div style={s.stat}>
                  <span style={{ ...s.statVal, color: criticalCount > 0 ? '#ff1744' : '#00e676' }}>{criticalCount}</span>
                  <span style={s.statLabel}>Critical</span>
                </div>
              </div>
              <ExportButton results={results} />
            </div>

            {results.length > 1 && (
              <div style={s.chartSection}>
                <ScoreBarChart results={results} />
              </div>
            )}

            {results.length > 1 && (
              <div style={s.domainTabs}>
                {results.map((result, index) => {
                  const gradeColor = result.score?.grade_color || '#64748b'
                  return (
                    <button
                      key={result.domain}
                      style={{
                        ...s.domainTab,
                        ...(index === activeDomainIdx ? { ...s.domainTabActive, borderColor: gradeColor, color: gradeColor } : {}),
                      }}
                      onClick={() => setActiveDomainIdx(index)}
                    >
                      <span style={{ fontSize: 11 }}>{result.reachable ? (result.score?.grade ?? '?') : '!'}</span>
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

      <footer style={s.footer}>
        <span>SecureScope v1.0 - Built for security research and education</span>
        <span style={{ color: '#334466' }}>|</span>
        <span>Backend: FastAPI + Python ssl | Frontend: React + Chart.js</span>
      </footer>
    </div>
  )
}

const s = {
  page: { minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg, #070b16 0%, #0b1220 100%)' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 32px',
    height: 60,
    borderBottom: '1px solid #1e2d50',
    background: '#0a0e1a',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    backdropFilter: 'blur(8px)',
  },
  navLogo: { display: 'flex', alignItems: 'center', gap: 10 },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 9,
    background: 'rgba(61,127,255,0.15)',
    border: '1px solid rgba(61,127,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 17, fontWeight: 700, color: '#e2e8f0' },
  logoSub: { fontSize: 13, color: '#9aaed4' },
  navRight: { display: 'flex', alignItems: 'center', gap: 16 },
  apiStatus: { display: 'flex', alignItems: 'center', gap: 7 },
  statusDot: { width: 8, height: 8, borderRadius: '50%' },
  newScanBtn: {
    padding: '7px 16px',
    borderRadius: 7,
    border: '1px solid rgba(61,127,255,0.4)',
    background: 'rgba(61,127,255,0.1)',
    color: '#3d7fff',
    cursor: 'pointer',
    fontSize: 13,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
  },
  main: { flex: 1, padding: '32px 24px', maxWidth: 1100, margin: '0 auto', width: '100%' },
  hero: { display: 'flex', flexDirection: 'column', gap: 36, position: 'relative' },
  heroGlow: {
    position: 'absolute',
    top: -80,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 600,
    height: 400,
    borderRadius: '50%',
    background: 'radial-gradient(ellipse, rgba(61,127,255,0.08) 0%, transparent 70%)',
    animation: 'heroGlow 6s ease-in-out infinite',
    pointerEvents: 'none',
  },
  heroText: { textAlign: 'center', position: 'relative' },
  heroTitle: { fontSize: 42, fontWeight: 700, color: '#e2e8f0', lineHeight: 1.15, marginBottom: 14 },
  heroAccent: { color: '#3d7fff' },
  heroSub: { fontSize: 18, color: '#b6c6e4', maxWidth: 620, margin: '0 auto 22px', lineHeight: 1.75 },
  pills: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: {
    background: 'rgba(61,127,255,0.08)',
    border: '1px solid rgba(61,127,255,0.2)',
    borderRadius: 20,
    padding: '5px 14px',
    fontSize: 13,
    color: '#d8e3f8',
    fontWeight: 500,
  },
  errorBox: {
    maxWidth: 500,
    margin: '60px auto',
    textAlign: 'center',
    background: 'rgba(255,82,82,0.06)',
    border: '1px solid rgba(255,82,82,0.2)',
    borderRadius: 16,
    padding: '36px 28px',
    animation: 'fadeIn 0.4s ease',
  },
  errorTitle: { fontSize: 20, fontWeight: 600, color: '#ff5252', marginBottom: 10 },
  errorMsg: { color: '#d6e0f4', fontSize: 15, lineHeight: 1.65 },
  retryBtn: {
    marginTop: 20,
    padding: '10px 24px',
    borderRadius: 8,
    border: '1px solid #ff5252',
    background: 'rgba(255,82,82,0.1)',
    color: '#ff5252',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
  },
  resultsWrap: { display: 'flex', flexDirection: 'column', gap: 20, animation: 'fadeIn 0.4s ease' },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    background: '#0f1629',
    border: '1px solid #1e2d50',
    borderRadius: 14,
    padding: '16px 24px',
    flexWrap: 'wrap',
  },
  summaryLeft: { flex: 1 },
  summaryTitle: { fontSize: 17, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 },
  summaryMeta: { fontSize: 13, color: '#bfd0ec' },
  summaryStats: { display: 'flex', alignItems: 'center', gap: 12 },
  stat: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 },
  statVal: { fontSize: 22, fontWeight: 700, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace" },
  statLabel: { fontSize: 11, color: '#bfd0ec', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 },
  statDivider: { width: 1, height: 36, background: '#1e2d50' },
  chartSection: {},
  domainTabs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  domainTab: {
    display: 'flex',
    alignItems: 'center',
    gap: 7,
    padding: '8px 14px',
    borderRadius: 8,
    border: '1px solid #1e2d50',
    background: '#0f1629',
    color: '#c7d5ef',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.15s',
  },
  domainTabActive: { background: 'rgba(61,127,255,0.08)' },
  footer: {
    padding: '16px 32px',
    borderTop: '1px solid #1e2d50',
    display: 'flex',
    gap: 12,
    fontSize: 11,
    color: '#8ea4cc',
    justifyContent: 'center',
  },
  historyWrap: { display: 'flex', flexDirection: 'column', gap: 10 },
  historyNote: { fontSize: 13, color: '#bfd0ec', textAlign: 'center' },
  historyError: { fontSize: 13, color: '#ffb4ab', textAlign: 'center' },
}
