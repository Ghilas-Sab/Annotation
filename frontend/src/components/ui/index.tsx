import React from 'react'
import { useTheme } from '../../contexts/ThemeContext'

// ── LOGO ──────────────────────────────────────────────────────────
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: size, height: size, borderRadius: Math.round(size * 0.28),
        background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(280 84% 65%))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 12px hsl(var(--primary) / 0.35)',
        flexShrink: 0,
      }}>
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 16 16" fill="none">
          {[2, 5, 8, 11, 14].map((x, i) => {
            const h = [3, 7, 12, 6, 4][i]
            return <rect key={i} x={x - 1} y={8 - h / 2} width="2.2" height={h} rx="1.1" fill="white" />
          })}
        </svg>
      </div>
      <span style={{
        fontWeight: 700, fontSize: size * 0.54,
        letterSpacing: '-0.025em', color: 'var(--fg)', lineHeight: 1,
      }}>
        Annota<span style={{ color: 'var(--ac)' }}>Rythm</span>
      </span>
    </div>
  )
}

// ── THEME TOGGLE ──────────────────────────────────────────────────
export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const dark = theme === 'dark'
  return (
    <button
      onClick={toggleTheme}
      title={dark ? 'Passer en clair' : 'Passer en sombre'}
      style={{
        width: 48, height: 26, borderRadius: 999,
        border: '1px solid var(--border-c)',
        background: dark ? 'hsl(228 14% 18%)' : 'hsl(220 60% 92%)',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 0.3s ease', padding: 0,
      }}
    >
      <span style={{ position: 'absolute', left: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, opacity: dark ? 0.7 : 0, transition: 'opacity 0.25s', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>🌙</span>
      <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 10, opacity: dark ? 0 : 0.8, transition: 'opacity 0.25s', lineHeight: 1, userSelect: 'none', pointerEvents: 'none' }}>☀️</span>
      <div style={{
        position: 'absolute', top: 3, left: dark ? 3 : 21,
        width: 18, height: 18, borderRadius: '50%',
        background: dark
          ? 'linear-gradient(135deg, hsl(240 60% 72%), hsl(265 70% 65%))'
          : 'linear-gradient(135deg, hsl(38 100% 65%), hsl(45 100% 58%))',
        boxShadow: dark ? '0 1px 4px hsl(0 0% 0% / 0.5)' : '0 1px 5px hsl(38 100% 50% / 0.5)',
        transition: 'left 0.26s cubic-bezier(0.34,1.56,0.64,1), background 0.3s ease',
      }} />
    </button>
  )
}

// ── BREADCRUMB ────────────────────────────────────────────────────
export function Breadcrumb({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ color: 'var(--text-3)', fontSize: 13 }}>/</span>}
          {item.onClick ? (
            <a href="#" onClick={e => { e.preventDefault(); item.onClick?.() }} style={{
              color: 'var(--text-2)', fontSize: 13,
              padding: '2px 4px', borderRadius: 4, transition: 'color 0.15s',
              textDecoration: 'none',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--fg)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-2)')}
            >{item.label}</a>
          ) : (
            <span style={{ color: 'var(--fg)', fontSize: 13, fontWeight: 500, padding: '2px 4px' }}>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ── ICONS ─────────────────────────────────────────────────────────
export const Icon = {
  Back: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Plus: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  Play: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><polygon points="4,3 13,8 4,13" fill="currentColor" /></svg>,
  Pause: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="4" y="3" width="3" height="10" rx="1" fill="currentColor" /><rect x="9" y="3" width="3" height="10" rx="1" fill="currentColor" /></svg>,
  SkipBack: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 3v10M12 4L6 8l6 4V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  SkipFwd: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M12 3v10M4 4l6 4-6 4V4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  StepBack: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M10 3L6 8l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="5" y1="3" x2="5" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  StepFwd: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 3l4 5-4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /><line x1="11" y1="3" x2="11" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  Trash: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3h4v1M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Edit: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M11 2l3 3-9 9H2v-3L11 2z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Search: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" /><path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  Settings: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" /><path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.2 3.2l1 1M11.8 11.8l1 1M3.2 12.8l1-1M11.8 4.2l1-1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  Keyboard: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="4" width="14" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M4 7h1M7 7h1M10 7h1M4 10h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  Export: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2v9M5 8l3 3 3-3M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Stats: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 13V9M6 13V6M10 13V3M14 13V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  Video: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M11 6.5L15 4V12L11 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>,
  Music: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M6 12V4l8-2v8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><circle cx="4" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" /><circle cx="12" cy="10" r="2" stroke="currentColor" strokeWidth="1.4" /></svg>,
  Upload: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 11V3M5 6l3-3 3 3M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Download: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 3v8M5 8l3 3 3-3M2 12v2h12v-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ChevronRight: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ChevronDown: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  X: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  Check: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Pin: () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 6h6M8 10l-3 4h6l-3-4z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Layers: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2L2 6l6 4 6-4-6-4zM2 10l6 4 6-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Undo: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 7.5A5 5 0 1 1 6 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M3 4v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  ZoomIn: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" /><path d="M11 11L14 14M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  ZoomOut: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" /><path d="M11 11L14 14M5 7h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
  Bell: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2a4 4 0 0 1 4 4v3l1.5 2h-11L4 9V6a4 4 0 0 1 4-4zM6 13a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  Film: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 3v10M11 3v10M1 6h14M1 10h14" stroke="currentColor" strokeWidth="1.2" opacity="0.6" /></svg>,
  AlertTriangle: () => <svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2L1 14h14L8 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M8 7v3M8 12v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  Waveform: () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none">{[2, 4, 6, 8, 10, 12, 14].map((x, i) => { const h = [3, 7, 10, 12, 9, 6, 4][i]; return <rect key={i} x={x - 0.8} y={8 - h / 2} width="1.6" height={h} rx="0.8" fill="currentColor" opacity="0.8" /> })}</svg>,
  Beep: ({ on }: { on: boolean }) => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M3 6H1v4h2l4 3V3L3 6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      {on ? (
        <>
          <path d="M11 5a4 4 0 0 1 0 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M13 3a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <path d="M13 5l-4 6M9 5l4 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  ),
}

// ── SPINNER ───────────────────────────────────────────────────────
export function Spinner({ size = 16, color = 'var(--ac)' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" strokeDasharray="28" strokeDashoffset="10" strokeLinecap="round" fill="none" opacity="0.25" />
      <circle cx="8" cy="8" r="6" stroke={color} strokeWidth="2" strokeDasharray="10" strokeLinecap="round" fill="none" />
    </svg>
  )
}

// ── EMPTY STATE ───────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '48px 32px', textAlign: 'center' }}>
      {icon && <div style={{ opacity: 0.35, marginBottom: 4 }}>{icon}</div>}
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6, color: 'var(--fg)' }}>{title}</div>
        {description && <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 320, lineHeight: 1.6 }}>{description}</div>}
      </div>
      {action}
    </div>
  )
}
