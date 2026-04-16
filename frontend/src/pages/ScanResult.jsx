/**
 * ScanResult.jsx
 * Renders the full report for a single domain result.
 * Tabs: Overview | Certificate & TLS | Vulnerabilities
 * Cyberpunk redesign — chamfered containers, neon tabs, terminal domain bar.
 */
import React, { useState } from 'react'
import ScoreCard from '../components/ScoreCard.jsx'
import CertificatePanel from '../components/CertificatePanel.jsx'
import VulnerabilityList from '../components/VulnerabilityList.jsx'
import { ScoreRadarChart } from '../components/ComparisonChart.jsx'
import { COLORS, SHADOWS, CLIP, FONT, TRANSITIONS } from '../theme.js'

const SEVERITY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, INFO: 4 }
const SEV_COLORS = { CRITICAL: COLORS.destructive, HIGH: '#ff5252', MEDIUM: COLORS.warn, LOW: COLORS.accent3, INFO: COLORS.mutedFg }

function SeverityDot({ sev }) {
  return (
    <span style={{ color: SEV_COLORS[sev] || COLORS.mutedFg, fontSize: 9, marginRight: 5 }}>◆</span>
  )
}

export default function ScanResult({ result }) {
  const [tab, setTab] = useState('overview')

  const critCount = result.vulnerabilities.filter(v => v.severity === 'CRITICAL').length
  const highCount = result.vulnerabilities.filter(v => v.severity === 'HIGH').length
  const alertCount = critCount + highCount

  if (!result.reachable) {
    return (
      <div style={s.errorCard}>
        <div style={s.errorIconWrap}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
              stroke={COLORS.destructive} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p style={s.errorEyebrow}>// DOMAIN UNREACHABLE</p>
        <p style={s.errorDomain}>{result.domain}</p>
        <p style={s.errorMsg}>{result.error_message || 'Connection failed — host may be down or port 443 is closed.'}</p>
        <p style={s.errorHint}>Verify the domain exists, has port 443 open, and supports HTTPS.</p>
      </div>
    )
  }

  const tabs = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'certificate', label: 'CERTIFICATE & TLS' },
    { id: 'vulnerabilities', label: `VULNERABILITIES${alertCount > 0 ? ` [${alertCount}]` : ''}` },
  ]

  return (
    <div style={s.wrap}>
      {/* Domain title bar */}
      <div style={s.domainBar}>
        <div style={s.domainLeft}>
          <div style={s.lockIcon}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                fill={COLORS.accent} opacity="0.9" />
              <path d="M9 12l2 2 4-4" stroke={COLORS.bg} strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <span style={s.domainName}>{result.domain}</span>
          <span style={s.scanTime}>// {new Date(result.scan_timestamp).toLocaleTimeString()}</span>
        </div>
        {result.score && (
          <div style={{
            ...s.gradePill,
            background: `${result.score.grade_color}15`,
            color: result.score.grade_color,
            border: `1px solid ${result.score.grade_color}50`,
            boxShadow: `0 0 10px ${result.score.grade_color}30`,
          }}>
            <span style={{ fontFamily: FONT.heading, fontSize: 16, fontWeight: 900 }}>{result.score.grade}</span>
            <span style={{ color: COLORS.mutedFg, margin: '0 6px' }}>·</span>
            <span style={{ fontFamily: FONT.body, fontSize: 12 }}>{result.score.total_score}/100</span>
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div style={s.tabBar}>
        {tabs.map(t => {
          const isActive = tab === t.id
          const hasBadge = t.id === 'vulnerabilities' && alertCount > 0
          return (
            <button
              key={t.id}
              id={`result-tab-${t.id}`}
              style={{
                ...s.tab,
                ...(isActive ? s.tabActive : {}),
                color: hasBadge && !isActive ? COLORS.destructive : isActive ? COLORS.accent : COLORS.mutedFg,
              }}
              onClick={() => setTab(t.id)}
            >
              {hasBadge && !isActive && (
                <span style={s.alertDot} />
              )}
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div style={s.content}>

        {/* ── Overview ─────────────────────────────────────── */}
        {tab === 'overview' && (
          <div style={s.overviewGrid}>
            <ScoreCard score={result.score} domain={result.domain} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {result.score && <ScoreRadarChart score={result.score} domain={result.domain} />}

              {result.vulnerabilities.length > 0 && (
                <div style={s.quickVulns}>
                  {/* Terminal header */}
                  <div style={s.quickTermHeader}>
                    <span style={{...s.termDot, background: COLORS.destructive}} />
                    <span style={{...s.termDot, background: COLORS.warn}} />
                    <span style={{...s.termDot, background: COLORS.accent}} />
                    <p style={s.quickTitle}>// TOP ISSUES</p>
                  </div>
                  <div style={{ padding: '12px 16px' }}>
                    {result.vulnerabilities.slice(0, 4).map(v => (
                      <div key={v.id} style={s.quickRow}>
                        <SeverityDot sev={v.severity} />
                        <span style={s.quickLabel}>[{v.id}]</span>
                        <span style={s.quickText}>{v.title}</span>
                      </div>
                    ))}
                    {result.vulnerabilities.length > 4 && (
                      <button
                        id="see-all-vulns-btn"
                        style={s.seeAll}
                        onClick={() => setTab('vulnerabilities')}
                        onMouseEnter={e => { e.currentTarget.style.color = COLORS.accent }}
                        onMouseLeave={e => { e.currentTarget.style.color = COLORS.accent3 }}
                      >
                        +{result.vulnerabilities.length - 4} MORE — VIEW ALL //
                      </button>
                    )}
                  </div>
                </div>
              )}

              {result.vulnerabilities.length === 0 && (
                <div style={s.allClear}>
                  <div style={s.allClearIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"
                        fill={COLORS.accent} opacity="0.15" stroke={COLORS.accent} strokeWidth="1.5" />
                      <path d="M9 12l2 2 4-4" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p style={s.allClearTitle}>ALL SYSTEMS CLEAR</p>
                  <p style={s.allClearSub}>No vulnerabilities detected on this target.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'certificate' && <CertificatePanel cert={result.certificate} tls={result.tls} />}
        {tab === 'vulnerabilities' && <VulnerabilityList vulnerabilities={result.vulnerabilities} />}
      </div>
    </div>
  )
}

const s = {
  wrap: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    overflow: 'hidden',
    animation: 'fadeIn 0.4s ease',
  },
  errorCard: {
    background: `${COLORS.destructive}06`,
    border: `1px solid ${COLORS.destructive}30`,
    clipPath: CLIP.chamfer,
    padding: '40px 28px',
    textAlign: 'center',
    animation: 'fadeIn 0.4s ease',
  },
  errorIconWrap: {
    width: 56, height: 56, borderRadius: '50%',
    background: `${COLORS.destructive}10`,
    border: `1px solid ${COLORS.destructive}40`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: SHADOWS.neonDestructive,
  },
  errorEyebrow: {
    fontFamily: FONT.label, fontSize: 11, color: COLORS.destructive,
    letterSpacing: '0.15em', marginBottom: 8,
  },
  errorDomain: {
    fontFamily: FONT.body, fontSize: 16, fontWeight: 700,
    color: COLORS.fg, marginBottom: 10, wordBreak: 'break-all',
  },
  errorMsg: { fontFamily: FONT.body, color: COLORS.destructive, fontSize: 13, marginBottom: 10, lineHeight: 1.6 },
  errorHint: { fontFamily: FONT.body, color: COLORS.mutedFg, fontSize: 12, lineHeight: 1.7 },

  domainBar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 20px', borderBottom: `1px solid ${COLORS.border}`,
    background: COLORS.card, flexWrap: 'wrap', gap: 10,
    boxShadow: `inset 0 -1px 0 ${COLORS.accent}10`,
  },
  domainLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  lockIcon: {
    width: 28, height: 28, clipPath: CLIP.chamferXs,
    background: `${COLORS.accent}15`, border: `1px solid ${COLORS.accent}40`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  domainName: {
    fontFamily: FONT.body, fontSize: 14, fontWeight: 700, color: COLORS.fg,
    letterSpacing: '0.03em',
  },
  scanTime: { fontFamily: FONT.label, fontSize: 11, color: COLORS.mutedFg, letterSpacing: '0.08em' },
  gradePill: {
    display: 'flex', alignItems: 'center',
    clipPath: CLIP.chamferXs, padding: '6px 14px',
  },

  tabBar: {
    display: 'flex', borderBottom: `1px solid ${COLORS.border}`,
    padding: '0 12px', background: COLORS.card,
  },
  tab: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', background: 'transparent', border: 'none',
    fontFamily: FONT.label, fontSize: 11, fontWeight: 700,
    letterSpacing: '0.12em', textTransform: 'uppercase',
    cursor: 'pointer', transition: TRANSITIONS.fast,
    position: 'relative',
  },
  tabActive: {
    color: COLORS.accent,
    borderBottom: `2px solid ${COLORS.accent}`,
    textShadow: `0 0 8px ${COLORS.accent}80`,
  },
  alertDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: COLORS.destructive,
    boxShadow: `0 0 4px ${COLORS.destructive}`,
    animation: 'neonPulse 1.5s ease-in-out infinite',
  },

  content: { padding: 20 },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'minmax(240px, 280px) 1fr',
    gap: 20,
  },

  quickVulns: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamferSm,
    overflow: 'hidden',
  },
  quickTermHeader: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '10px 16px', borderBottom: `1px solid ${COLORS.border}`,
    background: `${COLORS.bg}cc`,
  },
  termDot: { width: 8, height: 8, borderRadius: '50%' },
  quickTitle: {
    fontFamily: FONT.label, fontSize: 10, color: COLORS.accent,
    letterSpacing: '0.15em', textTransform: 'uppercase', marginLeft: 6,
  },
  quickRow: { display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 10 },
  quickLabel: {
    fontFamily: FONT.label, fontSize: 11, color: COLORS.accent3,
    letterSpacing: '0.05em', flexShrink: 0,
  },
  quickText: { fontFamily: FONT.body, fontSize: 12, color: COLORS.fg, lineHeight: 1.5 },
  seeAll: {
    marginTop: 10, background: 'none', border: 'none',
    fontFamily: FONT.label, fontSize: 10, letterSpacing: '0.12em',
    color: COLORS.accent3, cursor: 'pointer', padding: 0,
    textTransform: 'uppercase', transition: TRANSITIONS.fast,
  },

  allClear: {
    background: `${COLORS.accent}05`,
    border: `1px solid ${COLORS.accent}20`,
    clipPath: CLIP.chamferSm,
    padding: '28px 24px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  allClearIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: `${COLORS.accent}10`,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: SHADOWS.neonSm,
  },
  allClearTitle: {
    fontFamily: FONT.heading, fontSize: 14, fontWeight: 700,
    color: COLORS.accent, letterSpacing: '0.1em',
    textShadow: `0 0 10px ${COLORS.accent}60`,
  },
  allClearSub: { fontFamily: FONT.body, fontSize: 12, color: COLORS.mutedFg, textAlign: 'center' },
}
