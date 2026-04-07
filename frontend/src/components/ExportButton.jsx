/**
 * ExportButton.jsx
 * Generates a PDF security report using jsPDF + jspdf-autotable.
 */
import React, { useState } from 'react'

export default function ExportButton({ results }) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      // Dynamic import so jsPDF is only loaded when needed
      const { default: jsPDF } = await import('jspdf')
      await import('jspdf-autotable')

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = doc.internal.pageSize.getWidth()
      const now = new Date().toLocaleString()

      // ── Cover header ──────────────────────────────────────────
      doc.setFillColor(10, 14, 26)
      doc.rect(0, 0, pageW, 42, 'F')

      doc.setTextColor(61, 127, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('SecureScope', 14, 18)

      doc.setTextColor(148, 163, 184)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('TLS/HTTPS Security Analysis Report', 14, 26)
      doc.text(`Generated: ${now}`, 14, 33)
      doc.text(`Domains Scanned: ${results.length}`, 14, 39)

      let y = 52

      // ── Per-domain sections ───────────────────────────────────
      for (const r of results) {
        // Check if we need a new page
        if (y > 250) { doc.addPage(); y = 20 }

        // Domain header
        doc.setFillColor(15, 22, 41)
        doc.roundedRect(10, y, pageW - 20, 10, 2, 2, 'F')
        doc.setTextColor(226, 232, 240)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text(r.domain, 15, y + 7)

        // Grade badge
        if (r.score) {
          const gradeColors = {
            'A+': [0,200,83], 'A': [0,230,118], 'B': [255,235,59],
            'C': [255,152,0], 'D': [255,87,34], 'F': [244,67,54],
          }
          const gc = gradeColors[r.score.grade] || [148,163,184]
          doc.setFillColor(...gc)
          doc.roundedRect(pageW - 38, y + 1, 26, 8, 2, 2, 'F')
          doc.setTextColor(10, 14, 26)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'bold')
          doc.text(`${r.score.grade}  ${r.score.total_score}/100`, pageW - 36, y + 6.5)
        }
        y += 14

        // Unreachable
        if (!r.reachable) {
          doc.setTextColor(255, 82, 82)
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          doc.text(`⚠ Unreachable: ${r.error_message || 'Unknown error'}`, 15, y)
          y += 14
          continue
        }

        // Score summary
        if (r.score) {
          doc.setTextColor(148, 163, 184)
          doc.setFontSize(9)
          doc.setFont('helvetica', 'italic')
          doc.text(r.score.summary, 15, y)
          y += 8
        }

        // Certificate info table
        if (r.certificate) {
          const cert = r.certificate
          doc.autoTable({
            startY: y,
            margin: { left: 14, right: 14 },
            head: [['Certificate Field', 'Value']],
            body: [
              ['Subject (CN)', cert.subject],
              ['Issuer', cert.issuer],
              ['Expires On', cert.expires_on],
              ['Days Until Expiry', cert.is_expired ? `EXPIRED (${Math.abs(cert.days_until_expiry)} days ago)` : `${cert.days_until_expiry} days`],
              ['Self-Signed', cert.is_self_signed ? 'YES (Untrusted)' : 'No'],
              ['Key Type / Size', `${cert.key_type} ${cert.key_size}-bit`],
              ['Signature Algorithm', cert.signature_algorithm],
            ],
            styles: {
              fontSize: 8, cellPadding: 3,
              textColor: [226, 232, 240], fillColor: [15, 22, 41],
              lineColor: [30, 45, 80], lineWidth: 0.2,
            },
            headStyles: { fillColor: [10, 14, 26], textColor: [61, 127, 255], fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [10, 14, 26] },
          })
          y = doc.lastAutoTable.finalY + 6
        }

        // Vulnerabilities table
        if (r.vulnerabilities.length > 0) {
          if (y > 230) { doc.addPage(); y = 20 }
          doc.autoTable({
            startY: y,
            margin: { left: 14, right: 14 },
            head: [['ID', 'Severity', 'Issue', 'Recommendation']],
            body: r.vulnerabilities.map(v => [
              v.id, v.severity, v.title,
              v.recommendation.slice(0, 120) + (v.recommendation.length > 120 ? '...' : ''),
            ]),
            styles: {
              fontSize: 7.5, cellPadding: 3,
              textColor: [226, 232, 240], fillColor: [15, 22, 41],
              lineColor: [30, 45, 80], lineWidth: 0.2, overflow: 'linebreak',
            },
            headStyles: { fillColor: [10, 14, 26], textColor: [61, 127, 255], fontStyle: 'bold' },
            columnStyles: {
              0: { cellWidth: 20 }, 1: { cellWidth: 20 },
              2: { cellWidth: 55 }, 3: { cellWidth: 75 },
            },
            didParseCell: (data) => {
              if (data.column.index === 1 && data.section === 'body') {
                const sev = data.cell.raw
                const colors = { CRITICAL: [255,23,68], HIGH: [255,82,82], MEDIUM: [255,171,64], LOW: [64,196,255] }
                if (colors[sev]) data.cell.styles.textColor = colors[sev]
              }
            },
          })
          y = doc.lastAutoTable.finalY + 12
        } else {
          doc.setTextColor(0, 230, 118)
          doc.setFontSize(9)
          doc.text('✓ No vulnerabilities detected.', 15, y)
          y += 12
        }
      }

      // ── Footer on last page ───────────────────────────────────
      const pages = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(100, 116, 139)
        doc.text(`SecureScope Security Report — Page ${i} of ${pages}`, 14, 290)
        doc.text('For educational and security assessment purposes only.', pageW - 14, 290, { align: 'right' })
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
    <button style={{ ...s.btn, opacity: exporting ? 0.7 : 1 }} onClick={handleExport} disabled={exporting}>
      {exporting ? (
        <><span style={s.spin} /> Generating PDF...</>
      ) : (
        <>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginRight: 7 }}>
            <path d="M12 3v13M7 11l5 5 5-5M3 19h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Export PDF Report
        </>
      )}
      <style>{`@keyframes s{to{transform:rotate(360deg)}}`}</style>
    </button>
  )
}

const s = {
  btn: {
    display: 'inline-flex', alignItems: 'center',
    padding: '10px 20px', borderRadius: 8,
    border: '1px solid rgba(61,127,255,0.4)',
    background: 'rgba(61,127,255,0.1)', color: '#3d7fff',
    cursor: 'pointer', fontSize: 13, fontFamily: "'Space Grotesk', sans-serif",
    fontWeight: 500, transition: 'all 0.2s',
  },
  spin: {
    width: 13, height: 13, borderRadius: '50%',
    border: '2px solid rgba(61,127,255,0.3)', borderTopColor: '#3d7fff',
    animation: 's 0.7s linear infinite', marginRight: 8, display: 'inline-block',
  },
}
