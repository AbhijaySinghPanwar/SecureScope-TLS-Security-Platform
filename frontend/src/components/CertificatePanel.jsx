/**
 * CertificatePanel.jsx
 * Displays SSL certificate details and TLS configuration.
 * Cyberpunk redesign — chamfered card, terminal tabs, neon status badges.
 */
import React, { useState } from 'react'
import { COLORS, SHADOWS, CLIP, FONT, TRANSITIONS } from '../theme.js'

function InfoRow({ label, value, mono = false, highlight, children }) {
  return (
    <div style={s.row}>
      <span style={s.label}>{label}</span>
      <span style={{
        ...s.value,
        color: highlight || COLORS.fg,
        fontFamily: mono ? FONT.body : FONT.body,
      }}>
        {children ?? value ?? '—'}
      </span>
    </div>
  )
}

function StatusBadge({ ok, trueText, falseText }) {
  const color = ok ? COLORS.accent : COLORS.destructive
  return (
    <span style={{
      fontFamily: FONT.label,
      fontSize: 11, fontWeight: 700,
      clipPath: CLIP.chamferXs,
      padding: '4px 10px',
      background: `${color}12`,
      color,
      border: `1px solid ${color}50`,
      letterSpacing: '0.1em',
      boxShadow: ok ? SHADOWS.neonSm : SHADOWS.neonDestructive,
    }}>
      {ok ? `✓ ${trueText}` : `✗ ${falseText}`}
    </span>
  )
}

export default function CertificatePanel({ cert, tls }) {
  const [tab, setTab] = useState('cert')

  if (!cert && !tls) return null

  const expiryColor = cert
    ? cert.is_expired ? COLORS.destructive
      : cert.days_until_expiry <= 30 ? COLORS.warn
      : COLORS.accent
    : COLORS.mutedFg

  const expiryLabel = cert
    ? cert.is_expired
      ? `EXPIRED (${Math.abs(cert.days_until_expiry)} days ago)`
      : `${cert.days_until_expiry} days remaining`
    : '—'

  return (
    <div style={s.card}>
      {/* Sub-tabs */}
      <div style={s.tabs}>
        {['cert', 'tls'].map(id => (
          <button
            key={id}
            id={`cert-tab-${id}`}
            style={{
              ...s.tab,
              ...(tab === id ? s.tabActive : {}),
            }}
            onClick={() => setTab(id)}
          >
            {id === 'cert' ? 'CERTIFICATE' : 'TLS DETAILS'}
          </button>
        ))}
      </div>

      {/* Certificate tab */}
      {tab === 'cert' && cert && (
        <div style={s.content}>
          <InfoRow label="SUBJECT (CN)" value={cert.subject} mono />
          <InfoRow label="ISSUER" value={cert.issuer} />
          <InfoRow label="ISSUED ON" value={cert.issued_on} mono />
          <InfoRow label="EXPIRES ON" value={cert.expires_on} mono />
          <InfoRow label="DAYS UNTIL EXPIRY" value={expiryLabel} highlight={expiryColor} />
          <div style={s.row}>
            <span style={s.label}>STATUS</span>
            <StatusBadge ok={!cert.is_expired} trueText="VALID" falseText="EXPIRED" />
          </div>
          <div style={s.row}>
            <span style={s.label}>SELF-SIGNED</span>
            <StatusBadge ok={!cert.is_self_signed} trueText="CA-SIGNED" falseText="SELF-SIGNED" />
          </div>
          <InfoRow
            label="KEY TYPE / SIZE"
            value={`${cert.key_type}${cert.key_size > 0 ? ` ${cert.key_size}-BIT` : ''}`}
            mono
          />
          <InfoRow label="SIGNATURE ALGORITHM" value={cert.signature_algorithm} mono />
          <InfoRow label="SERIAL NUMBER" value={cert.serial_number} mono />
          {cert.san_domains.length > 0 && (
            <div style={s.row}>
              <span style={s.label}>SAN DOMAINS</span>
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

      {/* TLS Details tab */}
      {tab === 'tls' && tls && (
        <div style={s.content}>
          <InfoRow
            label="PROTOCOL VERSION"
            value={tls.protocol_version}
            mono
            highlight={tls.is_weak_protocol ? COLORS.destructive : COLORS.accent}
          />
          <InfoRow
            label="CIPHER SUITE"
            value={tls.cipher_suite}
            mono
            highlight={tls.is_weak_cipher ? COLORS.destructive : COLORS.fg}
          />
          <InfoRow label="CIPHER BITS" value={tls.cipher_bits ? `${tls.cipher_bits}-BIT` : '—'} mono />
          <div style={s.row}>
            <span style={s.label}>TLS 1.3 SUPPORT</span>
            <StatusBadge ok={tls.supports_tls13} trueText="SUPPORTED" falseText="NOT SUPPORTED" />
          </div>
          <div style={s.row}>
            <span style={s.label}>TLS 1.2 SUPPORT</span>
            <StatusBadge ok={tls.supports_tls12} trueText="SUPPORTED" falseText="NOT SUPPORTED" />
          </div>
          <div style={s.row}>
            <span style={s.label}>WEAK CIPHER</span>
            <StatusBadge ok={!tls.is_weak_cipher} trueText="CLEAN" falseText="WEAK CIPHER DETECTED" />
          </div>
          <div style={s.row}>
            <span style={s.label}>HSTS ENABLED</span>
            <StatusBadge ok={tls.hsts_enabled} trueText="ENABLED" falseText="DISABLED" />
          </div>
          {tls.hsts_enabled && (
            <InfoRow
              label="HSTS MAX-AGE"
              value={tls.hsts_max_age
                ? `${tls.hsts_max_age.toLocaleString()}s (${Math.round(tls.hsts_max_age / 86400)} days)`
                : 'NOT SET'}
              mono
            />
          )}
        </div>
      )}

      {tab === 'cert' && !cert && <p style={s.noData}>&gt; Certificate data unavailable.</p>}
      {tab === 'tls' && !tls && <p style={s.noData}>&gt; TLS data unavailable.</p>}
    </div>
  )
}

const s = {
  card: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    overflow: 'hidden',
    animation: 'fadeIn 0.5s ease',
  },
  tabs: {
    display: 'flex',
    borderBottom: `1px solid ${COLORS.border}`,
    background: `${COLORS.bg}cc`,
  },
  tab: {
    flex: 1,
    padding: '12px 16px',
    background: 'transparent',
    border: 'none',
    fontFamily: FONT.label,
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: COLORS.mutedFg,
    cursor: 'pointer',
    transition: TRANSITIONS.fast,
  },
  tabActive: {
    color: COLORS.accent3,
    borderBottom: `2px solid ${COLORS.accent3}`,
    background: `${COLORS.accent3}05`,
    textShadow: `0 0 8px ${COLORS.accent3}60`,
  },
  content: {
    padding: '8px 24px 20px',
    display: 'flex', flexDirection: 'column',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    padding: '11px 0',
    borderBottom: `1px solid ${COLORS.border}30`,
  },
  label: {
    fontFamily: FONT.label,
    fontSize: 10, color: COLORS.mutedFg,
    flexShrink: 0, minWidth: 160,
    paddingTop: 3, letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: FONT.body,
    fontSize: 12, wordBreak: 'break-all',
    textAlign: 'right',
  },
  sanList: { display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'flex-end' },
  sanChip: {
    background: `${COLORS.accent3}10`,
    border: `1px solid ${COLORS.accent3}30`,
    clipPath: CLIP.chamferXs,
    padding: '3px 8px',
    fontFamily: FONT.body,
    fontSize: 11,
    color: COLORS.accent3,
  },
  noData: {
    padding: '28px 24px',
    fontFamily: FONT.body,
    color: COLORS.mutedFg,
    fontSize: 13, textAlign: 'center',
  },
}
