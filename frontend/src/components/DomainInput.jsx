/**
 * DomainInput.jsx
 * Input panel for entering one or multiple domains to scan.
 * Supports comma/newline separation and quick-fill test domains.
 */
import React, { useState, useEffect } from 'react'
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

export default function DomainInput({ onScan, isLoading, initialValue = '' }) {
  const [raw, setRaw] = useState(initialValue)
  const [testDomains, setTestDomains] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    setRaw(initialValue)
  }, [initialValue])

  useEffect(() => {
    getTestDomains()
      .then(d => setTestDomains(d.domains))
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

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit()
  }

  function addTestDomain(domain) {
    setRaw(prev => {
      const existing = analyzeDomains(prev).validDomains
      if (existing.includes(domain)) return prev
      return prev.trim() ? `${prev.trim()}\n${domain}` : domain
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
          : 'Paste domains or URLs. We normalize them automatically.'
  const helperColor = hasBlockingIssues ? '#ffab40' : '#64748b'

  return (
    <div style={s.card}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.iconWrap}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#3d7fff" strokeWidth="1.5"/>
            <path d="M12 2C12 2 8 7 8 12s4 10 4 10M12 2c0 0 4 5 4 10s-4 10-4 10M2 12h20" stroke="#3d7fff" strokeWidth="1.5"/>
          </svg>
        </div>
        <div>
          <h2 style={s.title}>Domain Scanner</h2>
          <p style={s.subtitle}>Enter domains to analyze — one per line, or comma-separated</p>
        </div>
      </div>

      {/* Textarea */}
      <div style={s.textareaWrap}>
        <textarea
          style={s.textarea}
          value={raw}
          onChange={e => { setRaw(e.target.value); setError('') }}
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

      {error && <p style={s.error}>⚠ {error}</p>}

      {/* Test domain chips */}
      <div style={s.chipsSection}>
        <span style={s.chipsLabel}>Quick test:</span>
        <div style={s.chips}>
          {testDomains.map(d => (
            <button key={d} style={s.chip} onClick={() => addTestDomain(d)} disabled={isLoading}>
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={s.actions}>
        <button style={s.clearBtn} onClick={() => setRaw('')} disabled={isLoading || !raw}>
          Clear
        </button>
        <button style={s.scanBtn} onClick={handleSubmit} disabled={isLoading || !raw.trim()}>
          {isLoading ? (
            <>
              <span style={s.spinner} /> Scanning...
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: 8 }}>
                <circle cx="11" cy="11" r="8" stroke="white" strokeWidth="2"/>
                <path d="M21 21l-4.35-4.35" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Scan {domainCount > 0 ? `${domainCount} Domain${domainCount > 1 ? 's' : ''}` : 'Domains'}
            </>
          )}
        </button>
      </div>

      <p style={s.hint}>Tip: Press Ctrl+Enter to scan • Max 10 domains</p>

      <style>{`
        textarea::placeholder { color: #334466; }
        textarea:focus { outline: none; border-color: #3d7fff !important; box-shadow: 0 0 0 3px rgba(61,127,255,0.15); }
        .chip-btn:hover { background: #1e2d50 !important; border-color: #3d7fff !important; color: #fff !important; }
        @keyframes btnSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

const s = {
  card: {
    background: '#0f1629', border: '1px solid #1e2d50', borderRadius: 16,
    padding: '28px 32px', maxWidth: 700, margin: '0 auto',
    animation: 'fadeIn 0.5s ease',
  },
  header: { display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 },
  iconWrap: {
    width: 44, height: 44, borderRadius: 10,
    background: 'rgba(61,127,255,0.1)', border: '1px solid rgba(61,127,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  title: { fontSize: 18, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 },
  subtitle: { fontSize: 13, color: '#64748b' },
  textareaWrap: { position: 'relative', marginBottom: 12 },
  textarea: {
    width: '100%', background: '#0a0e1a', border: '1px solid #1e2d50',
    borderRadius: 10, padding: '14px 16px', color: '#e2e8f0',
    fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.7,
    resize: 'vertical', transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  countBadge: {
    position: 'absolute', top: 10, right: 12,
    background: 'rgba(61,127,255,0.15)', border: '1px solid rgba(61,127,255,0.3)',
    borderRadius: 20, padding: '2px 10px', fontSize: 11,
    color: '#3d7fff', fontWeight: 600,
  },
  error: { color: '#ff5252', fontSize: 13, marginBottom: 10 },
  chipsSection: { marginBottom: 20 },
  chipsLabel: { fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: {
    background: '#0a0e1a', border: '1px solid #1e2d50', borderRadius: 6,
    padding: '4px 10px', fontSize: 12, color: '#94a3b8', cursor: 'pointer',
    fontFamily: "'JetBrains Mono', monospace", transition: 'all 0.15s',
  },
  actions: { display: 'flex', gap: 10, marginBottom: 10 },
  clearBtn: {
    padding: '10px 20px', borderRadius: 8, border: '1px solid #1e2d50',
    background: 'transparent', color: '#64748b', cursor: 'pointer',
    fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500,
    transition: 'all 0.15s',
  },
  scanBtn: {
    flex: 1, padding: '11px 24px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg, #3d7fff, #0055ff)',
    color: '#fff', cursor: 'pointer', fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(61,127,255,0.3)',
  },
  spinner: {
    width: 14, height: 14, borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
    animation: 'btnSpin 0.7s linear infinite', marginRight: 8, display: 'inline-block',
  },
  hint: { fontSize: 11, color: '#334466', textAlign: 'center' },
}
