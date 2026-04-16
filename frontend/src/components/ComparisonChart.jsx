/**
 * ComparisonChart.jsx
 * Chart.js visualizations: bar chart for multi-domain score comparison
 * and a radar chart for per-category breakdown.
 * Cyberpunk redesign — neon grid lines, green radar fill, chamfered wrapper.
 */
import React, { useEffect, useRef } from 'react'
import {
  Chart, BarController, BarElement, LineElement, PointElement, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  Tooltip, Legend, Filler,
} from 'chart.js'
import { COLORS, CLIP, FONT } from '../theme.js'

Chart.register(
  BarController, BarElement, LineElement, PointElement, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  Tooltip, Legend, Filler,
)

const GRADE_COLORS = {
  'A+': '#00C853', 'A': '#00E676', 'B': '#FFEB3B',
  'C': '#FF9800', 'D': '#FF5722', 'F': '#F44336',
}

/* ─── Bar chart ─────────────────────────────────────────────── */
export function ScoreBarChart({ results }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (chartRef.current) chartRef.current.destroy()

    const labels = results.map(r => r.domain)
    const scores = results.map(r => r.score?.total_score ?? 0)
    const colors = results.map(r => GRADE_COLORS[r.score?.grade] ?? COLORS.mutedFg)

    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Security Score',
          data: scores,
          backgroundColor: colors.map(c => c + '22'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 0,        // Sharp — no rounded bars
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: {
              color: COLORS.mutedFg,
              font: { family: FONT.label, size: 10 },
              maxRotation: 30,
            },
            grid: { color: `${COLORS.border}60` },
            border: { color: COLORS.border },
          },
          y: {
            min: 0, max: 100,
            ticks: {
              color: COLORS.mutedFg,
              font: { family: FONT.label, size: 10 },
              stepSize: 25,
            },
            grid: { color: `${COLORS.border}60` },
            border: { color: COLORS.border },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
            borderWidth: 1,
            titleColor: COLORS.accent,
            bodyColor: COLORS.fg,
            titleFont: { family: FONT.label, size: 11 },
            bodyFont: { family: FONT.body, size: 12 },
            padding: 12,
            callbacks: {
              label: ctx => {
                const r = results[ctx.dataIndex]
                return ` SCORE: ${ctx.raw}/100   GRADE: ${r.score?.grade ?? 'N/A'}`
              },
            },
          },
        },
        animation: { duration: 1000, easing: 'easeOutQuart' },
      },
    })
    return () => chartRef.current?.destroy()
  }, [results])

  return (
    <div style={s.chartWrap}>
      <p style={s.chartTitle}>// SECURITY SCORE COMPARISON</p>
      <div style={{ height: 220 }}>
        <canvas ref={ref} />
      </div>
    </div>
  )
}

/* ─── Radar chart ───────────────────────────────────────────── */
export function ScoreRadarChart({ score, domain }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current || !score) return
    if (chartRef.current) chartRef.current.destroy()

    const breakdown = Object.values(score.breakdown)
    const labels = breakdown.map(b => b.label)
    const actual = breakdown.map(b => b.score)
    const max    = breakdown.map(b => b.max)
    const pcts   = actual.map((a, i) => Math.round((a / max[i]) * 100))

    chartRef.current = new Chart(ref.current, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: domain,
          data: pcts,
          backgroundColor: `${COLORS.accent}12`,
          borderColor: COLORS.accent,
          borderWidth: 2,
          pointBackgroundColor: COLORS.accent,
          pointBorderColor: COLORS.bg,
          pointBorderWidth: 2,
          pointRadius: 4,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            min: 0, max: 100,
            ticks: { display: false },
            grid: { color: `${COLORS.border}80` },
            angleLines: { color: `${COLORS.border}80` },
            pointLabels: {
              color: COLORS.mutedFg,
              font: { family: FONT.label, size: 10 },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: COLORS.card,
            borderColor: COLORS.border,
            borderWidth: 1,
            titleColor: COLORS.accent,
            bodyColor: COLORS.fg,
            titleFont: { family: FONT.label, size: 11 },
            bodyFont: { family: FONT.body, size: 12 },
            padding: 12,
            callbacks: { label: ctx => ` ${ctx.raw}%` },
          },
        },
        animation: { duration: 1000, easing: 'easeOutQuart' },
      },
    })
    return () => chartRef.current?.destroy()
  }, [score, domain])

  return (
    <div style={s.chartWrap}>
      <p style={s.chartTitle}>// SCORE BREAKDOWN — {domain}</p>
      <div style={{ height: 250 }}>
        <canvas ref={ref} />
      </div>
    </div>
  )
}

const s = {
  chartWrap: {
    background: COLORS.card,
    border: `1px solid ${COLORS.border}`,
    clipPath: CLIP.chamfer,
    padding: '20px 24px',
    animation: 'fadeIn 0.5s ease',
  },
  chartTitle: {
    fontFamily: FONT.label,
    fontSize: 10, fontWeight: 700, color: COLORS.accent,
    marginBottom: 16, letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
}
