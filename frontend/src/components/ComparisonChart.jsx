/**
 * ComparisonChart.jsx
 * Chart.js visualizations: bar chart for multi-domain score comparison
 * and a radar chart for per-category breakdown.
 */
import React, { useEffect, useRef } from 'react'
import {
  Chart, BarController, BarElement, LineElement, PointElement, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  Tooltip, Legend, Filler,
} from 'chart.js'

// Register only what we use (tree-shaking friendly)
Chart.register(
  BarController, BarElement, LineElement, PointElement, RadarController,
  CategoryScale, LinearScale, RadialLinearScale,
  Tooltip, Legend, Filler,
)

const GRADE_COLORS = {
  'A+': '#00C853', 'A': '#00E676', 'B': '#FFEB3B',
  'C': '#FF9800', 'D': '#FF5722', 'F': '#F44336',
}

/* ─── Bar chart: scores for all domains ──────────────────────── */
export function ScoreBarChart({ results }) {
  const ref = useRef(null)
  const chartRef = useRef(null)

  useEffect(() => {
    if (!ref.current) return
    if (chartRef.current) chartRef.current.destroy()

    const labels = results.map(r => r.domain)
    const scores = results.map(r => r.score?.total_score ?? 0)
    const colors = results.map(r => GRADE_COLORS[r.score?.grade] ?? '#64748b')

    chartRef.current = new Chart(ref.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Security Score',
          data: scores,
          backgroundColor: colors.map(c => c + '30'),
          borderColor: colors,
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            ticks: { color: '#d8e3f8', font: { family: "'JetBrains Mono', monospace", size: 12 } },
            grid: { color: '#1e2d50' },
            border: { color: '#1e2d50' },
          },
          y: {
            min: 0, max: 100,
            ticks: { color: '#d8e3f8', font: { size: 12 } },
            grid: { color: '#1e2d50' },
            border: { color: '#1e2d50' },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f1629',
            borderColor: '#1e2d50',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#e6eefc',
            callbacks: {
              label: ctx => {
                const r = results[ctx.dataIndex]
                return ` Score: ${ctx.raw}/100  Grade: ${r.score?.grade ?? 'N/A'}`
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
      <p style={s.chartTitle}>Security Score Comparison</p>
      <div style={{ height: 220 }}>
        <canvas ref={ref} />
      </div>
    </div>
  )
}

/* ─── Radar chart: breakdown for a single domain ─────────────── */
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
          backgroundColor: 'rgba(61,127,255,0.15)',
          borderColor: '#3d7fff',
          borderWidth: 2,
          pointBackgroundColor: '#3d7fff',
          pointBorderColor: '#0a0e1a',
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
            grid: { color: '#1e2d50' },
            angleLines: { color: '#1e2d50' },
            pointLabels: {
              color: '#e6eefc',
              font: { family: "'Space Grotesk', sans-serif", size: 12 },
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f1629',
            borderColor: '#1e2d50',
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#e6eefc',
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
      <p style={s.chartTitle}>Score Breakdown — {domain}</p>
      <div style={{ height: 260 }}>
        <canvas ref={ref} />
      </div>
    </div>
  )
}

const s = {
  chartWrap: {
    background: '#0f1629', border: '1px solid #1e2d50',
    borderRadius: 16, padding: '20px 24px', animation: 'fadeIn 0.5s ease',
  },
  chartTitle: {
    fontSize: 14, fontWeight: 700, color: '#e6eefc',
    marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.06em',
  },
}
