/**
 * ScanResult.jsx
 * Renders the full report for a single domain result.
 * Tabs: Overview | Certificate | Vulnerabilities
 */
import React, { useState } from 'react'
import ScoreCard from '../components/ScoreCard.jsx'
import CertificatePanel from '../components/CertificatePanel.jsx'
import VulnerabilityList from '../components/VulnerabilityList.jsx'
import { ScoreRadarChart } from '../components/ComparisonChart.jsx'

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }

function severityDot(sev) {
  const colors = { CRITICAL: '#ff1744', HIGH: '#ff5252', MEDIUM: '#ffab40', LOW: '#40c4ff', INFO: '#94a3b8' }
  return <span style={{ color: colors[sev] || '#94a3b8', fontSize: 10, marginRight: 4 }}>●</span>
}

export default function ScanResult({ result }) {
  const [tab, setTab] = useState('overview')

  // Count vulns by severity for tab badge
  const critCount = result.vulnerabilities.filter(v => v.severity === 'CRITICAL').length
  const highCount = result.vulnerabilities.filter(v => v.severity === 'HIGH').length

  const tabBadge = (critCount + highCount) > 0
    ? <span style={s.badge}>{critCount + highCount}</span>
    : null

  if (!result.reachable) {
    return (
      <div style={s.errorCard}>
        <div style={s.errorIcon}>⚠️</div>
        <p style={s.errorDomain}>{result.domain}</p>
        <p style={s.errorMsg}>{result.error_message || 'Domain could not be reached.'}</p>
        <p style={s.errorHint}>Check that the domain exists, has port 443 open, and supports HTTPS.</p>
      </div>
    )
  }

  return (
    <div style={s.wrap}>
      {/* Domain title bar */}
      <div style={s.domainBar}>
        <div style={s.domainLeft}>
          <span style={s.lockIcon}>🔐</span>
          <span style={s.domainName}>{result.domain}</span>
          <span style={s.scanTime}>Scanned {new Date(result.scan_timestamp).toLocaleTimeString()}</span>
        </div>
        {result.score && (
          <div style={{ ...s.gradePill, background: result.score.grade_color + '22', color: result.score.grade_color, border: `1px solid ${result.score.grade_color}55` }}>
            {result.score.grade} · {result.score.total_score}/100
          </div>
        )}
      </div>

      {/* Inner tabs */}
      <div style={s.tabs}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'certificate', label: 'Certificate & TLS' },
          { id: 'vulnerabilities', label: <>Vulnerabilities {tabBadge}</> },
        ].map(t => (
          <button key={t.id} style={{ ...s.tab, ...(tab === t.id ? s.tabActive : {}) }} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={s.content}>

        {/* ── Overview tab ─────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={s.overviewGrid}>
            <ScoreCard score={result.score} domain={result.domain} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {result.score && <ScoreRadarChart score={result.score} domain={result.domain} />}

              {/* Quick-glance vuln summary */}
              {result.vulnerabilities.length > 0 && (
                <div style={s.quickVulns}>
                  <p style={s.quickTitle}>Top Issues</p>
                  {result.vulnerabilities.slice(0, 4).map(v => (
                    <div key={v.id} style={s.quickRow}>
                      {severityDot(v.severity)}
                      <span style={s.quickLabel}>[{v.id}]</span>
                      <span style={s.quickText}>{v.title}</span>
                    </div>
                  ))}
                  {result.vulnerabilities.length > 4 && (
                    <button style={s.seeAll} onClick={() => setTab('vulnerabilities')}>
                      +{result.vulnerabilities.length - 4} more → See all
                    </button>
                  )}
                </div>
              )}

              {result.vulnerabilities.length === 0 && (
                <div style={s.allClear}>
                  <span style={{ fontSize: 24 }}>✅</span>
                  <p style={{ color: '#00e676', fontWeight: 600, fontSize: 14 }}>All checks passed</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Certificate tab ───────────────────────────────── */}
        {tab === 'certificate' && (
          <CertificatePanel cert={result.certificate} tls={result.tls} />
        )}

        {/* ── Vulnerabilities tab ───────────────────────────── */}
        {tab === 'vulnerabilities' && (
          <VulnerabilityList vulnerabilities={result.vulnerabilities} />
        )}
      </div>
    </div>
  )
}

const s = {
  wrap: {
    background: '#0a0e1a', border: '1px solid #1e2d50',
    borderRadius: 16, overflow: 'hidden', animation: 'fadeIn 0.4s ease',
  },
  errorCard: {
    background: 'rgba(255,82,82,0.06)', border: '1px solid rgba(255,82,82,0.2)',
    borderRadius: 16, padding: '32px 24px', textAlign: 'center', animation: 'fadeIn 0.4s ease',
  },
  errorIcon: { fontSize: 32, marginBottom: 10 },
  errorDomain: { fontSize: 16, fontWeight: 600, color: '#e2e8f0', fontFamily: "'JetBrains Mono', monospace", marginBottom: 8 },
  errorMsg: { color: '#ff5252', fontSize: 13, marginBottom: 8 },
  errorHint: { color: '#c1d0ea', fontSize: 13, lineHeight: 1.6 },
  domainBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: '1px solid #1e2d50',
    background: '#0f1629', flexWrap: 'wrap', gap: 8,
  },
  domainLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  lockIcon: { fontSize: 16 },
  domainName: {
    fontSize: 15, fontWeight: 600, color: '#e2e8f0',
    fontFamily: "'JetBrains Mono', monospace",
  },
  scanTime: { fontSize: 12, color: '#c1d0ea', fontWeight: 500 },
  gradePill: { fontSize: 13, fontWeight: 700, borderRadius: 20, padding: '4px 14px' },
  tabs: { display: 'flex', borderBottom: '1px solid #1e2d50', padding: '0 12px', background: '#0f1629' },
  tab: {
    padding: '11px 16px', background: 'transparent', border: 'none',
    color: '#c7d5ef', cursor: 'pointer', fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
    transition: 'color 0.15s', display: 'flex', alignItems: 'center', gap: 6,
  },
  tabActive: { color: '#3d7fff', borderBottom: '2px solid #3d7fff' },
  badge: {
    background: '#ff1744', color: '#fff', fontSize: 10,
    borderRadius: 999, padding: '1px 6px', fontWeight: 700,
  },
  content: { padding: 20 },
  overviewGrid: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 },
  quickVulns: {
    background: '#0f1629', border: '1px solid #1e2d50',
    borderRadius: 12, padding: '16px 18px',
  },
  quickTitle: {
    fontSize: 12, color: '#c1d0ea', textTransform: 'uppercase',
    letterSpacing: '0.08em', marginBottom: 10,
  },
  quickRow: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 },
  quickLabel: { fontSize: 12, color: '#d0dcf4', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 },
  quickText: { fontSize: 14, color: '#eef4ff', lineHeight: 1.5 },
  seeAll: {
    marginTop: 8, background: 'none', border: 'none',
    color: '#8cb8ff', fontSize: 13, cursor: 'pointer',
    padding: 0, fontFamily: "'Space Grotesk', sans-serif",
  },
  allClear: {
    background: 'rgba(0,230,118,0.05)', border: '1px solid rgba(0,230,118,0.15)',
    borderRadius: 12, padding: '24px', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 8,
  },
}
