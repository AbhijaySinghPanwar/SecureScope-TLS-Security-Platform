import React, { useEffect, useState } from 'react'
import { getTestDomains } from '../services/api.js'

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

    if (!DOMAIN_PATTERN.test(normalized)) {
      invalidDomains.push(token)
      continue
    }

    if (seen.has(normalized)) {
      duplicateDomains.push(normalized)
      continue
    }

    seen.add(normalized)
    validDomains.push(normalized)
  }

  return {
    validDomains,
    invalidDomains,
    duplicateDomains,
    overLimit: validDomains.length > MAX_DOMAINS,
  }
}

export default function ValidatedDomainInput({ onScan, isLoading, initialValue = '' }) {
  const [raw, setRaw] = useState(initialValue)
  const [testDomains, setTestDomains] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setRaw(initialValue)
  }, [initialValue])

  useEffect(() => {
    getTestDomains()
      .then((data) => setTestDomains(data.domains))
      .catch(() => {})
  }, [])

  function handleSubmit() {
    const analysis = analyzeDomains(raw)

    if (!analysis.validDomains.length) {
      setError('Please enter at least one domain.')
      return
    }
    if (analysis.invalidDomains.length) {
      setError('Remove invalid domains before scanning.')
      return
    }
    if (analysis.duplicateDomains.length) {
      setError('Remove duplicate domains before scanning.')
      return
    }
    if (analysis.overLimit) {
      setError(`Maximum ${MAX_DOMAINS} domains per scan.`)
      return
    }

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
    ? `Invalid: ${analysis.invalidDomains.join(', ')}`
    : analysis.duplicateDomains.length
      ? `Duplicates: ${analysis.duplicateDomains.join(', ')}`
      : analysis.overLimit
        ? `You can scan up to ${MAX_DOMAINS} domains at once.`
        : domainCount > 0
          ? `${domainCount} valid domain${domainCount > 1 ? 's' : ''} ready to scan.`
          : 'Paste domains or full URLs. We normalize them automatically.'
  const helperColor = hasBlockingIssues ? '#ffab40' : '#64748b'

  return (
    <div style={s.card}>
      <div style={s.header}>
        <div style={s.iconWrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#3d7fff" strokeWidth="1.5" />
            <path d="M12 2C12 2 8 7 8 12s4 10 4 10M12 2c0 0 4 5 4 10s-4 10-4 10M2 12h20" stroke="#3d7fff" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <h2 style={s.title}>Domain Scanner</h2>
          <p style={s.subtitle}>Enter domains to analyze, one per line or comma-separated.</p>
        </div>
      </div>

      <div style={s.textareaWrap}>
        <textarea
          style={s.textarea}
          value={raw}
          onChange={(event) => {
            setRaw(event.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDER}
          rows={5}
          disabled={isLoading}
          spellCheck={false}
        />
        {domainCount > 0 && (
          <div style={s.countBadge}>{domainCount} domain{domainCount > 1 ? 's' : ''}</div>
        )}
      </div>

      {error && <p style={s.error}>Warning: {error}</p>}
      <p style={{ ...s.helper, color: helperColor }}>{helperMessage}</p>

      <div style={s.chipsSection}>
        <span style={s.chipsLabel}>Quick test:</span>
        <div style={s.chips}>
          {testDomains.map((domain) => (
            <button key={domain} style={s.chip} onClick={() => addTestDomain(domain)} disabled={isLoading}>
              {domain}
            </button>
          ))}
        </div>
      </div>

      <div style={s.actions}>
        <button style={s.clearBtn} onClick={() => setRaw('')} disabled={isLoading || !raw}>
          Clear
        </button>
        <button style={s.scanBtn} onClick={handleSubmit} disabled={isLoading || !raw.trim() || hasBlockingIssues}>
          {isLoading ? (
            <>
              <span style={s.spinner} /> Scanning...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2" />
                <path d="M21 21l-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Scan {domainCount > 0 ? `${domainCount} Domain${domainCount > 1 ? 's' : ''}` : 'Domains'}
            </>
          )}
        </button>
      </div>

      <p style={s.hint}>Tip: Press Ctrl+Enter to scan. Maximum {MAX_DOMAINS} domains per run.</p>

      <style>{`
        textarea::placeholder { color: #8197c0; }
        textarea:focus { outline: none; border-color: #3d7fff !important; box-shadow: 0 0 0 3px rgba(61,127,255,0.15); }
        @keyframes btnSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const s = {
  card: {
    background: '#121a2f',
    border: '1px solid #28406f',
    borderRadius: 16,
    padding: '28px 32px',
    maxWidth: 700,
    margin: '0 auto',
    animation: 'fadeIn 0.5s ease',
  },
  header: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'rgba(61,127,255,0.1)',
    border: '1px solid rgba(61,127,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { fontSize: 19, fontWeight: 700, color: '#f3f7ff', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#c1d0ea', lineHeight: 1.6 },
  textareaWrap: { position: 'relative', marginBottom: 12 },
  textarea: {
    width: '100%',
    background: '#0a1020',
    border: '1px solid #2f4777',
    borderRadius: 10,
    padding: '14px 16px',
    color: '#eef4ff',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 15,
    lineHeight: 1.8,
    resize: 'vertical',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  countBadge: {
    position: 'absolute',
    top: 10,
    right: 12,
    background: 'rgba(61,127,255,0.15)',
    border: '1px solid rgba(61,127,255,0.3)',
    borderRadius: 20,
    padding: '2px 10px',
    fontSize: 12,
    color: '#d8e6ff',
    fontWeight: 600,
  },
  error: { color: '#ffb4ab', fontSize: 14, marginBottom: 8, fontWeight: 600 },
  helper: { fontSize: 14, marginBottom: 14, lineHeight: 1.6 },
  chipsSection: { marginBottom: 20 },
  chipsLabel: {
    fontSize: 12,
    color: '#d2def4',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    display: 'block',
    marginBottom: 8,
  },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    background: '#0c1324',
    border: '1px solid #2a416f',
    borderRadius: 6,
    padding: '4px 10px',
    fontSize: 13,
    color: '#e3ecfb',
    cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace",
    transition: 'all 0.15s',
  },
  actions: { display: 'flex', gap: 10, marginBottom: 10 },
  clearBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    border: '1px solid #1e2d50',
    background: 'transparent',
    color: '#d6e2f7',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  scanBtn: {
    flex: 1,
    padding: '11px 24px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #3d7fff, #0055ff)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
    boxShadow: '0 4px 15px rgba(61,127,255,0.3)',
  },
  spinner: {
    width: 14,
    height: 14,
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff',
    animation: 'btnSpin 0.7s linear infinite',
    marginRight: 8,
    display: 'inline-block',
  },
  hint: { fontSize: 12, color: '#a7bbde', textAlign: 'center', lineHeight: 1.5 },
}
