/**
 * theme.js — SecureScope Cyberpunk Design System Tokens
 * Single source of truth for all visual design values.
 * Import what you need: import { COLORS, SHADOWS, CLIP, FONT } from '../theme.js'
 */

export const COLORS = {
  bg:           '#0a0a0f',   // Deep void black
  card:         '#12121a',   // Card backgrounds
  muted:        '#1c1c2e',   // Elevated backgrounds
  mutedFg:      '#6b7280',   // Secondary text
  fg:           '#e0e0e0',   // Primary text
  border:       '#2a2a3a',   // Subtle borders
  input:        '#0a0a0f',   // Input backgrounds

  accent:       '#00ff88',   // PRIMARY — Electric green
  accent2:      '#ff00ff',   // SECONDARY — Hot magenta
  accent3:      '#00d4ff',   // TERTIARY — Cyan/electric blue

  destructive:  '#ff3366',   // Error/danger
  warn:         '#ffab40',   // Warning
}

export const SHADOWS = {
  neonSm:        `0 0 3px ${COLORS.accent}, 0 0 6px ${COLORS.accent}30`,
  neon:          `0 0 5px ${COLORS.accent}, 0 0 10px ${COLORS.accent}40`,
  neonLg:        `0 0 10px ${COLORS.accent}, 0 0 20px ${COLORS.accent}60, 0 0 40px ${COLORS.accent}30`,
  neonSecondary: `0 0 5px ${COLORS.accent2}, 0 0 20px ${COLORS.accent2}60`,
  neonTertiary:  `0 0 5px ${COLORS.accent3}, 0 0 20px ${COLORS.accent3}60`,
  neonDestructive: `0 0 5px ${COLORS.destructive}, 0 0 15px ${COLORS.destructive}50`,
}

/**
 * Chamfered clip-path corners — the signature shape of this design system.
 * Apply via: clipPath: CLIP.chamfer
 */
export const CLIP = {
  chamfer:   'polygon(0 12px, 12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px))',
  chamferSm: 'polygon(0 8px, 8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px))',
  chamferXs: 'polygon(0 5px, 5px 0, calc(100% - 5px) 0, 100% 5px, 100% calc(100% - 5px), calc(100% - 5px) 100%, 5px 100%, 0 calc(100% - 5px))',
}

export const FONT = {
  heading: '"Orbitron", "Share Tech Mono", monospace',
  body:    '"JetBrains Mono", "Fira Code", "Consolas", monospace',
  label:   '"Share Tech Mono", monospace',
}

export const TRANSITIONS = {
  fast:    'all 100ms cubic-bezier(0.4, 0, 0.2, 1)',
  base:    'all 150ms cubic-bezier(0.4, 0, 0.2, 1)',
  smooth:  'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
}
