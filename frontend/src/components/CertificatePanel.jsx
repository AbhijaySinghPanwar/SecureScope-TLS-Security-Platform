import React, { useState } from 'react'

function InfoRow({ label, value, mono = false, highlight, children }) {
  const textStyle = {
    fontSize: 14,
    color: highlight || '#e2e8f0',
    fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
    wordBreak: 'break-all',
  }

  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <span style={textStyle}>{children ?? value ?? '-'}</span>
    </div>
  )
}

function StatusBadge({ ok, trueText, falseText }) {
  return (
    <span
      style={{
        ...s.badge,
        background: ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,82,82,0.12)',
    color: ok ? '#9cf7c4' : '#ffb4ab',
        border: `1px solid ${ok ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)'}`,
      }}
    >
      {ok ? `OK ${trueText}` : `NO ${falseText}`}
    </span>
  )
}

export default function CertificatePanel({ cert, tls }) {
  const [tab, setTab] = useState('cert')

  if (!cert && !tls) return null

  const expiryColor = cert
    ? cert.is_expired
      ? '#ff5252'
      : cert.days_until_expiry <= 30
        ? '#ffab40'
        : '#00e676'
    : '#94a3b8'

  const expiryLabel = cert
    ? cert.is_expired
      ? `EXPIRED (${Math.abs(cert.days_until_expiry)} days ago)`
      : `${cert.days_until_expiry} days remaining`
    : '-'

  return (
    <div style={s.card}>
      <div style={s.tabs}>
        <button style={{ ...s.tab, ...(tab === 'cert' ? s.tabActive : {}) }} onClick={() => setTab('cert')}>
          Certificate
        </button>
        <button style={{ ...s.tab, ...(tab === 'tls' ? s.tabActive : {}) }} onClick={() => setTab('tls')}>
          TLS Details
        </button>
      </div>

      {tab === 'cert' && cert && (
        <div style={s.content}>
          <InfoRow label="Subject (CN)" value={cert.subject} mono />
          <InfoRow label="Issuer" value={cert.issuer} />
          <InfoRow label="Issued On" value={cert.issued_on} mono />
          <InfoRow label="Expires On" value={cert.expires_on} mono />
          <InfoRow label="Days Until Expiry" value={expiryLabel} highlight={expiryColor} />
          <InfoRow label="Status">
            <StatusBadge ok={!cert.is_expired} trueText="Valid" falseText="Expired" />
          </InfoRow>
          <div style={s.row}>
            <span style={s.label}>Self-Signed</span>
            <StatusBadge ok={!cert.is_self_signed} trueText="CA-signed" falseText="Self-signed" />
          </div>
          <InfoRow
            label="Key Type / Size"
            value={`${cert.key_type}${cert.key_size > 0 ? ` ${cert.key_size}-bit` : ''}`}
            mono
          />
          <InfoRow label="Signature Algorithm" value={cert.signature_algorithm} mono />
          <InfoRow label="Serial Number" value={cert.serial_number} mono />
          {cert.san_domains.length > 0 && (
            <div style={s.row}>
              <span style={s.label}>SAN Domains</span>
              <div style={s.sanList}>
                {cert.san_domains.slice(0, 8).map((domain) => (
                  <span key={domain} style={s.sanChip}>{domain}</span>
                ))}
                {cert.san_domains.length > 8 && (
                  <span style={s.sanChip}>+{cert.san_domains.length - 8} more</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'tls' && tls && (
        <div style={s.content}>
          <InfoRow
            label="Protocol Version"
            value={tls.protocol_version}
            mono
            highlight={tls.is_weak_protocol ? '#ff5252' : '#00e676'}
          />
          <InfoRow
            label="Cipher Suite"
            value={tls.cipher_suite}
            mono
            highlight={tls.is_weak_cipher ? '#ff5252' : '#e2e8f0'}
          />
          <InfoRow label="Cipher Bits" value={tls.cipher_bits ? `${tls.cipher_bits}-bit` : '-'} mono />
          <div style={s.row}>
            <span style={s.label}>TLS 1.3 Support</span>
            <StatusBadge ok={tls.supports_tls13} trueText="Supported" falseText="Not supported" />
          </div>
          <div style={s.row}>
            <span style={s.label}>TLS 1.2 Support</span>
            <StatusBadge ok={tls.supports_tls12} trueText="Supported" falseText="Not supported" />
          </div>
          <div style={s.row}>
            <span style={s.label}>Weak Cipher</span>
            <StatusBadge ok={!tls.is_weak_cipher} trueText="No" falseText="Weak cipher" />
          </div>
          <div style={s.row}>
            <span style={s.label}>HSTS Enabled</span>
            <StatusBadge ok={tls.hsts_enabled} trueText="Yes" falseText="No" />
          </div>
          {tls.hsts_enabled && (
            <InfoRow
              label="HSTS max-age"
              value={tls.hsts_max_age ? `${tls.hsts_max_age.toLocaleString()}s (${Math.round(tls.hsts_max_age / 86400)} days)` : 'Not set'}
              mono
            />
          )}
        </div>
      )}

      {tab === 'cert' && !cert && <p style={s.noData}>Certificate data unavailable.</p>}
      {tab === 'tls' && !tls && <p style={s.noData}>TLS data unavailable.</p>}
    </div>
  )
}

const s = {
  card: {
    background: '#0f1629',
    border: '1px solid #1e2d50',
    borderRadius: 16,
    overflow: 'hidden',
    animation: 'fadeIn 0.5s ease',
  },
  tabs: { display: 'flex', borderBottom: '1px solid #1e2d50' },
  tab: {
    flex: 1,
    padding: '13px 16px',
    background: 'transparent',
    border: 'none',
    color: '#c7d5ef',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500,
    transition: 'all 0.15s',
  },
  tabActive: {
    color: '#3d7fff',
    borderBottom: '2px solid #3d7fff',
    background: 'rgba(61,127,255,0.06)',
  },
  content: { padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 0 },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '10px 0',
    borderBottom: '1px solid #0f1a30',
  },
  label: { fontSize: 13, color: '#c7d5ef', flexShrink: 0, minWidth: 160, paddingTop: 2, fontWeight: 500 },
  badge: { fontSize: 12, borderRadius: 6, padding: '4px 9px', fontWeight: 700 },
  sanList: { display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  sanChip: {
    background: 'rgba(61,127,255,0.1)',
    border: '1px solid rgba(61,127,255,0.2)',
    borderRadius: 4,
    padding: '2px 7px',
    fontSize: 12,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#e6eefc',
  },
  noData: { padding: 24, color: '#c7d5ef', fontSize: 14, textAlign: 'center' },
}
