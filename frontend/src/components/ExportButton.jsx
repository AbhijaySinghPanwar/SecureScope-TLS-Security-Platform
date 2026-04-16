/**
 * ExportButton.jsx
 * Generates a PDF security report using jsPDF + jspdf-autotable.
 * Cyberpunk redesign — chamfered outline button, neon green accent.
 */
import React, { useState } from 'react'
import { COLORS, SHADOWS, CLIP, FONT, TRANSITIONS } from '../theme.js'

export default function ExportButton({ results }) {
  const [exporting, setExporting] = useState(false)
  const [hovered, setHovered] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const now = new Date().toLocaleString()

      // ── Cover header ──────────────────────────────────────────
      doc.setFillColor(10, 10, 15)     // COLORS.bg
      doc.rect(0, 0, pageW, 46, 'F')

      // Left accent bar
      doc.setFillColor(0, 255, 136)    // COLORS.accent
      doc.rect(0, 0, 3, 46, 'F')

      doc.setTextColor(0, 255, 136)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('SECURESCOPE', 10, 18)

      doc.setTextColor(107, 114, 128)  // COLORS.mutedFg
      doc.setFontSize(9)
      doc.setFont('courier', 'normal')
      doc.text('// TLS/HTTPS SECURITY ANALYSIS REPORT', 10, 27)
      doc.text(`// GENERATED: ${now}`, 10, 34)
      doc.text(`// DOMAINS SCANNED: ${results.length}`, 10, 40)

      let y = 56

      // ── Per-domain sections ───────────────────────────────────
      for (const r of results) {
        if (y > 250) { doc.addPage(); y = 20 }

        // Domain header
        doc.setFillColor(18, 18, 26)   // COLORS.card
        doc.rect(8, y, pageW - 16, 12, 'F')
        // Left accent
        doc.setFillColor(0, 212, 255)  // COLORS.accent3
        doc.rect(8, y, 3, 12, 'F')

        doc.setTextColor(224, 224, 224) // COLORS.fg
        doc.setFontSize(11)
        doc.setFont('courier', 'bold')
        doc.text(r.domain.toUpperCase(), 14, y + 8)

        // Grade badge
        if (r.score) {
          const gradeColors = {
            'A+': [0,200,83], 'A': [0,230,118], 'B': [255,235,59],
            'C': [255,152,0], 'D': [255,87,34], 'F': [244,67,54],
          }
          const gc = gradeColors[r.score.grade] || [107,114,128]
          doc.setFillColor(...gc)
          doc.rect(pageW - 36, y + 2, 26, 8, 'F')
          doc.setTextColor(10, 10, 15)
          doc.setFontSize(8)
          doc.setFont('courier', 'bold')
          doc.text(`${r.score.grade}  ${r.score.total_score}/100`, pageW - 34, y + 7.5)
        }
        y += 16

        if (!r.reachable) {
          doc.setTextColor(255, 51, 102) // COLORS.destructive
          doc.setFontSize(9)
          doc.setFont('courier', 'normal')
          doc.text(`// ERROR: ${r.error_message || 'Domain unreachable'}`, 14, y)
          y += 14
          continue
        }

        // Summary
        if (r.score) {
          doc.setTextColor(107, 114, 128)
          doc.setFontSize(8)
          doc.setFont('courier', 'italic')
          doc.text(`// ${r.score.summary}`, 14, y)
          y += 8
        }

        // Certificate table
        if (r.certificate) {
          const cert = r.certificate
          doc.autoTable({
            startY: y,
            margin: { left: 12, right: 12 },
            head: [['FIELD', 'VALUE']],
            body: [
              ['SUBJECT (CN)', cert.subject],
              ['ISSUER', cert.issuer],
              ['EXPIRES ON', cert.expires_on],
              ['DAYS UNTIL EXPIRY', cert.is_expired ? `EXPIRED (${Math.abs(cert.days_until_expiry)} days ago)` : `${cert.days_until_expiry} days`],
              ['SELF-SIGNED', cert.is_self_signed ? 'YES (UNTRUSTED)' : 'NO'],
              ['KEY TYPE / SIZE', `${cert.key_type} ${cert.key_size}-BIT`],
              ['SIGNATURE ALGORITHM', cert.signature_algorithm],
            ],
            styles: {
              fontSize: 8, cellPadding: 3,
              font: 'courier',
              textColor: [224, 224, 224],
              fillColor: [18, 18, 26],
              lineColor: [42, 42, 58],
              lineWidth: 0.2,
            },
            headStyles: {
              fillColor: [10, 10, 15],
              textColor: [0, 255, 136],
              fontStyle: 'bold',
            },
            alternateRowStyles: { fillColor: [10, 10, 15] },
          })
          y = doc.lastAutoTable.finalY + 6
        }

        // Vulnerabilities table
        if (r.vulnerabilities.length > 0) {
          if (y > 230) { doc.addPage(); y = 20 }
          doc.autoTable({
            startY: y,
            margin: { left: 12, right: 12 },
            head: [['ID', 'SEVERITY', 'ISSUE', 'RECOMMENDATION']],
            body: r.vulnerabilities.map(v => [
              v.id, v.severity, v.title,
              v.recommendation.slice(0, 120) + (v.recommendation.length > 120 ? '...' : ''),
            ]),
            styles: {
              fontSize: 7.5, cellPadding: 3,
              font: 'courier',
              textColor: [224, 224, 224],
              fillColor: [18, 18, 26],
              lineColor: [42, 42, 58],
              lineWidth: 0.2, overflow: 'linebreak',
            },
            headStyles: {
              fillColor: [10, 10, 15],
              textColor: [0, 212, 255],
              fontStyle: 'bold',
            },
            columnStyles: {
              0: { cellWidth: 20 }, 1: { cellWidth: 20 },
              2: { cellWidth: 55 }, 3: { cellWidth: 75 },
            },
            didParseCell: (data) => {
              if (data.column.index === 1 && data.section === 'body') {
                const sev = data.cell.raw
                const colors = {
                  CRITICAL: [255, 51, 102], HIGH: [255, 82, 82],
                  MEDIUM: [255, 171, 64], LOW: [0, 212, 255],
                }
                if (colors[sev]) data.cell.styles.textColor = colors[sev]
              }
            },
          })
          y = doc.lastAutoTable.finalY + 14
        } else {
          doc.setTextColor(0, 255, 136)
          doc.setFontSize(9)
          doc.setFont('courier', 'normal')
          doc.text('// NO VULNERABILITIES DETECTED', 14, y)
          y += 14
        }
      }

      // ── Footer ────────────────────────────────────────────────
      const pages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFontSize(7)
        doc.setFont('courier', 'normal')
        doc.setTextColor(42, 42, 58)
        doc.text(`SECURESCOPE SECURITY REPORT — PAGE ${i} OF ${pages}`, 12, 290)
        doc.text('FOR EDUCATIONAL AND SECURITY ASSESSMENT PURPOSES ONLY.', pageW - 12, 290, { align: 'right' })
      }

      doc.save(`securescope-report-${Date.now()}.pdf`)
    } catch (err) {
      console.error('PDF export failed:', err)
      alert('PDF export failed. See console for details.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <button
      id="export-pdf-btn"
      style={{
        ...s.btn,
        opacity: exporting ? 0.6 : 1,
        background: hovered && !exporting ? COLORS.accent : 'transparent',
        color: hovered && !exporting ? COLORS.bg : COLORS.accent,
        boxShadow: hovered && !exporting ? SHADOWS.neonLg : SHADOWS.neonSm,
      }}
      onClick={handleExport}
      disabled={exporting}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {exporting ? (
        <>
          <span style={s.spin} /> GENERATING PDF...
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ marginRight: 7 }}>
            <path d="M12 3v13M7 11l5 5 5-5M3 19h18"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          EXPORT REPORT
        </>
      )}
      <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
    </button>
  )
}

const s = {
  btn: {
    display: 'inline-flex', alignItems: 'center',
    fontFamily: FONT.label,
    fontSize: 11, fontWeight: 700,
    letterSpacing: '0.15em', textTransform: 'uppercase',
    padding: '10px 20px',
    clipPath: CLIP.chamferSm,
    border: `2px solid ${COLORS.accent}`,
    cursor: 'pointer',
    transition: TRANSITIONS.base,
    flexShrink: 0,
  },
  spin: {
    width: 11, height: 11, borderRadius: '50%',
    border: `2px solid currentColor`,
    borderTopColor: 'transparent',
    animation: 's 0.7s linear infinite', marginRight: 8,
    display: 'inline-block',
  },
}
