import React, { useEffect, useState } from 'react'
import { getTestDomains } from '../services/api.js'
import { COLORS, SHADOWS, CLIP, FONT, TRANSITIONS } from '../theme.js'

const PLACEHOLDER = `google.com\ngithub.com\nexpired.badssl.com`
const MAX_DOMAINS = 10
const DOMAIN_PATTERN = /^(?=.{1,253}$)(?!-)(?:[a-z0-9-]{1,63}\.)+[a-z]{2,63}$/

function normalizeDomain(value) {
  return value
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/:\d+$/, '')
    .replace(/\.$/, '')
    .toLowerCase()
}

function analyzeDomains(text) {
  const tokens = text
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)

  const validDomains = []
  const invalidDomains = []
  const duplicateDomains = []
  const seen = new Set()

  for (const token of tokens) {
    const normalized = normalizeDomain(token)
    if (!DOMAIN_PATTERN.test(normalized)) { invalidDomains.push(token); continue }
    if (seen.has(normalized)) { duplicateDomains.push(normalized); continue }
    seen.add(normalized)
    validDomains.push(normalized)
  }

  return { validDomains, invalidDomains, duplicateDomains, overLimit: validDomains.length > MAX_DOMAINS }
}

export default function ValidatedDomainInput({ onScan, isLoading, initialValue = '' }) {
  const [raw, setRaw] = useState(initialValue)
  const [testDomains, setTestDomains] = useState([])
  const [error, setError] = useState('')

  useEffect(() => { setRaw(initialValue) }, [initialValue])

  useEffect(() => {
    getTestDomains()
      .then((data) => setTestDomains(data.domains))
      .catch(() => {})
  }, [])

  function handleSubmit() {
    const analysis = analyzeDomains(raw)
    if (!analysis.validDomains.length) { setError('Please enter at least one domain.'); return }
    if (analysis.invalidDomains.length) { setError('Remove invalid domains before scanning.'); return }
    if (analysis.duplicateDomains.length) { setError('Remove duplicate domains before scanning.'); return }
    if (analysis.overLimit) { setError(`Maximum ${MAX_DOMAINS} domains per scan.`); return }
    setError('')
    onScan(analysis.validDomains)
  }

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') handleSubmit()
  }

  function addTestDomain(domain) {
    setRaw((previous) => {
      const existing = analyzeDomains(previous).validDomains
      if (existing.includes(domain)) return previous
      return previous.trim() ? `${previous.trim()}\n${domain}` : domain
    })
  }

  const analysis = analyzeDomains(raw)
  const domainCount = analysis.validDomains.length
  const hasBlockingIssues = analysis.invalidDomains.length > 0 || analysis.duplicateDomains.length > 0 || analysis.overLimit
  const helperMessage = analysis.invalidDomains.length
    ? `// INVALID: ${analysis.invalidDomains.join(', ')}`
    : analysis.duplicateDomains.length
      ? `// DUPLICATE: ${analysis.duplicateDomains.join(', ')}`
      : analysis.overLimit
        ? `// MAX ${MAX_DOMAINS} DOMAINS PER SCAN`
        : domainCount > 0
          ? `// ${domainCount} TARGET${domainCount > 1 ? 'S' : ''} QUEUED — READY TO INITIATE`
          : '// PASTE DOMAINS OR FULL URLS — WE NORMALIZE AUTOMATICALLY'
  const helperColor = hasBlockingIssues ? COLORS.warn : domainCount > 0 ? COLORS.accent : COLORS.mutedFg

  return (
    <div style={s.card}>
      {/* Terminal header bar */}
      <div style={s.termHeader}>
        <span style={s.termDot(COLORS.destructive)} />
        <span style={s.termDot(COLORS.warn)} />
        <span style={s.termDot(COLORS.accent)} />
        <span style={s.termTitle}>DOMAIN_SCANNER.exe</span>
      </div>

      <div style={s.body}>
        {/* Header */}
        <div style={s.header}>
          <div style={s.iconWrap}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke={COLORS.accent} strokeWidth="1.5"/>
              <path d="M12 2C12 2 8 7 8 12s4 10 4 10M12 2c0 0 4 5 4 10s-4 10-4 10M2 12h20" stroke={COLORS.accent} strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <h2 style={s.title}>DOMAIN SCANNER</h2>
            <p style={s.subtitle}>Enter targets — one per line or comma-separated</p>
          </div>
        </div>

        {/* Textarea */}
        <div style={s.textareaWrap}>
          <span style={s.prompt}>&gt;</span>
          <textarea
            id="domain-input"
            style={s.textarea}
            value={raw}
            onChange={(event) => { setRaw(event.target.value); setError('') }}
            onKeyDown={handleKeyDown}
            placeholder={PLACEHOLDER}
            rows={5}
            disabled={isLoading}
            spellCheck={false}
          />
          {domainCount > 0 && (
            <div style={s.countBadge}>
              {domainCount} TARGET{domainCount > 1 ? 'S' : ''}
            </div>
          )}
        </div>

        {/* Validation feedback */}
        {error && (
          <p style={s.error}>
            <span style={{ color: COLORS.destructive }}>!</span> {error}
          </p>
        )}
        <p style={{ ...s.helper, color: helperColor }}>{helperMessage}</p>

        {/* Quick test chips */}
        <div style={s.chipsSection}>
          <span style={s.chipsLabel}>// QUICK TEST TARGETS:</span>
          <div style={s.chips}>
            {testDomains.map((domain) => (
              <button
                key={domain}
                id={`chip-${domain}`}
                style={s.chip}
                onClick={() => addTestDomain(domain)}
                disabled={isLoading}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = COLORS.accent3
                  e.currentTarget.style.color = COLORS.accent3
                  e.currentTarget.style.boxShadow = SHADOWS.neonTertiary
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = COLORS.border
                  e.currentTarget.style.color = COLORS.mutedFg
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {domain}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={s.actions}>
          <button
            id="clear-btn"
            style={s.clearBtn}
            onClick={() => setRaw('')}
            disabled={isLoading || !raw}
            onMouseEnter={e => { e.currentTarget.style.borderColor = COLORS.mutedFg; e.currentTarget.style.color = COLORS.fg }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = COLORS.border; e.currentTarget.style.color = COLORS.mutedFg }}
          >
            CLEAR
          </button>

          <button
            id="scan-submit-btn"
            style={{
              ...s.scanBtn,
              opacity: (isLoading || !raw.trim() || hasBlockingIssues) ? 0.5 : 1,
              cursor: (isLoading || !raw.trim() || hasBlockingIssues) ? 'not-allowed' : 'pointer',
            }}
            onClick={handleSubmit}
            disabled={isLoading || !raw.trim() || hasBlockingIssues}
            onMouseEnter={e => {
              if (!isLoading && raw.trim() && !hasBlockingIssues) {
                e.currentTarget.style.boxShadow = SHADOWS.neonLg
                e.currentTarget.style.filter = 'brightness(1.1)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = SHADOWS.neon
              e.currentTarget.style.filter = 'none'
            }}
          >
            {isLoading ? (
              <>
                <span style={s.spinner} /> SCANNING...
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                  <circle cx="11" cy="11" r="8" stroke={COLORS.bg} strokeWidth="2.5"/>
                  <path d="M21 21l-4.35-4.35" stroke={COLORS.bg} strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
                INITIATE SCAN {domainCount > 0 ? `[${domainCount}]` : ''}
              </>
            )}
          </button>
        </div>

        <p style={s.hint}>// CTRL+ENTER TO SCAN &nbsp;·&nbsp; MAX {MAX_DOMAINS} DOMAINS</p>
      </div>

      <style>{`
        #domain-input::placeholder { color: #3a3a52; }
        #domain-input:focus { outline: none; border-color: ${COLORS.accent} !important; box-shadow: 0 0 0 2px ${COLORS.accent}20, 0 0 10px ${COLORS.accent}30 !important; }
        @keyframes btnSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const termDot = (color) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  background: color,
  boxShadow: `0 0 4px ${color}80`,
  flexShrink: 0,
})

const s = {
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    maxWidth: 700,
    margin: '0 auto',
    animation: 'fadeIn 0.5s ease',
    overflow: 'hidden',
  },
  termHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    background: `${COLORS.bg}cc`,
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
  body: { padding: '24px 28px' },
  header: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 },
  iconWrap: {
    width: 42,
    height: 42,
    clipPath: CLIP.chamferSm,
    background: `${COLORS.accent}10`,
    border: `1px solid ${COLORS.accent}30`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontFamily: FONT.heading,
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.accent,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    marginBottom: 4,
    textShadow: `0 0 10px ${COLORS.accent}60`,
  },
  subtitle: {
    fontFamily: FONT.body,
    fontSize: 12,
    color: COLORS.mutedFg,
    letterSpacing: '0.03em',
  },
  textareaWrap: { position: 'relative', marginBottom: 10 },
  prompt: {
    position: 'absolute',
    left: 14,
    top: 14,
    fontFamily: FONT.body,
    fontSize: 14,
    color: COLORS.accent,
    zIndex: 2,
    userSelect: 'none',
    textShadow: `0 0 6px ${COLORS.accent}`,
  },
  textarea: {
    width: '100%',
    background: COLORS.input,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamferSm,
    padding: '14px 16px 14px 32px',
    color: COLORS.accent,
    fontFamily: FONT.body,
    fontSize: 13,
    lineHeight: 1.8,
    resize: 'vertical',
    transition: TRANSITIONS.base,
    caretColor: COLORS.accent,
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    background: `${COLORS.accent}15`,
    border: `1px solid ${COLORS.accent}40`,
    clipPath: CLIP.chamferXs,
    padding: '3px 10px',
    fontFamily: FONT.label,
    fontSize: 10,
    color: COLORS.accent,
    fontWeight: 700,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  error: {
    fontFamily: FONT.body,
    color: COLORS.warn,
    fontSize: 12,
    marginBottom: 8,
    letterSpacing: '0.05em',
  },
  helper: {
    fontFamily: FONT.label,
    fontSize: 11,
    marginBottom: 16,
    lineHeight: 1.6,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  chipsSection: { marginBottom: 20 },
  chipsLabel: {
    fontFamily: FONT.label,
    fontSize: 10,
    color: COLORS.mutedFg,
    textTransform: 'uppercase',
    letterSpacing: '0.12em',
    display: 'block',
    marginBottom: 8,
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    background: COLORS.bg,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamferXs,
    padding: '4px 10px',
    fontFamily: FONT.body,
    fontSize: 11,
    color: COLORS.mutedFg,
    cursor: 'pointer',
    transition: TRANSITIONS.base,
  },
  actions: { display: 'flex', gap: 10, marginBottom: 12 },
  clearBtn: {
    fontFamily: FONT.label,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    padding: '10px 18px',
    clipPath: CLIP.chamferSm,
    border: `1px solid ${COLORS.border}`,
    background: 'transparent',
    color: COLORS.mutedFg,
    cursor: 'pointer',
    transition: TRANSITIONS.base,
  },
  scanBtn: {
    flex: 1,
    fontFamily: FONT.label,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    padding: '12px 24px',
    clipPath: CLIP.chamferSm,
    border: 'none',
    background: COLORS.accent,
    color: COLORS.bg,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: TRANSITIONS.base,
    boxShadow: SHADOWS.neon,
  },
  spinner: {
    width: 12,
    height: 12,
    borderRadius: '50%',
    border: `2px solid ${COLORS.bg}40`,
    borderTopColor: COLORS.bg,
    animation: 'btnSpin 0.7s linear infinite',
    marginRight: 8,
    display: 'inline-block',
  },
  hint: {
    fontFamily: FONT.label,
    fontSize: 10,
    color: COLORS.mutedFg,
    textAlign: 'center',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
}
