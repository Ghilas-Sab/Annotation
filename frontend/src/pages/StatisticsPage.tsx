import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useVideo } from '../api/projects'
import { useVideoStatistics } from '../api/statistics'
import { Logo, ThemeToggle, Breadcrumb, Icon, EmptyState, Spinner } from '../components/ui'
import type { RhythmicSegment } from '../types/statistics'

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, accent = '', delay = 0 }: {
  label: string; value: string | number; unit?: string; accent?: string; delay?: number
}) {
  const [visible, setVisible] = useState(false)
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t) }, [delay])
  return (
    <div className="stat-card" style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(8px)', transition: 'opacity 0.3s ease, transform 0.3s ease' }}>
      <div className="stat-label">{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
        <span className="stat-val" style={accent ? { color: accent } : {}}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{unit}</span>}
      </div>
    </div>
  )
}

function Histogram({ values, delay = 0 }: { values: number[]; delay?: number }) {
  if (!values.length) return null
  const bucketSize = 5
  const min = Math.floor(Math.min(...values) / bucketSize) * bucketSize
  const max = Math.ceil(Math.max(...values) / bucketSize) * bucketSize
  const buckets: { label: number; count: number }[] = []
  for (let b = min; b < max; b += bucketSize) {
    buckets.push({ label: b, count: values.filter(v => v >= b && v < b + bucketSize).length })
  }
  const maxCount = Math.max(...buckets.map(b => b.count), 1)

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 120, padding: '0 2px' }}>
      {buckets.map((b, i) => {
        const pct = (b.count / maxCount) * 100
        const isMode = b.count === maxCount
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, height: '100%', justifyContent: 'flex-end', gap: 3 }}>
            {b.count > 0 && <span style={{ fontSize: 9, color: 'var(--text-2)', fontFamily: 'monospace' }}>{b.count}</span>}
            <div style={{ width: '100%', height: `${pct}%`, minHeight: b.count > 0 ? 3 : 0, borderRadius: '3px 3px 0 0', overflow: 'hidden', background: 'var(--border-c)' }}>
              <div style={{
                width: '100%', height: '100%',
                background: isMode ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-1)/0.45)',
                boxShadow: isMode ? '0 0 12px hsl(var(--chart-1)/0.4)' : 'none',
                borderRadius: '3px 3px 0 0',
                animation: `chartBar 0.5s cubic-bezier(0.34,1.2,0.64,1) ${delay + i * 40}ms both`,
              }} />
            </div>
            <span style={{ fontSize: 8, color: 'var(--text-3)', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{b.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function BPMLineChart({ segments, delay = 0 }: { segments: RhythmicSegment[]; delay?: number }) {
  const [drawn, setDrawn] = useState(false)
  useEffect(() => { const t = setTimeout(() => setDrawn(true), delay); return () => clearTimeout(t) }, [delay])
  if (!segments.length) return null
  const bpms = segments.map(s => s.bpm)
  const min = Math.min(...bpms) - 5
  const max = Math.max(...bpms) + 5
  const range = max - min || 1
  const W = 500, H = 110
  const pts: [number, number][] = bpms.map((b, i) => [
    (i / Math.max(bpms.length - 1, 1)) * W,
    H - ((b - min) / range) * H,
  ])
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = path + ` L${W},${H} L0,${H} Z`

  return (
    <svg width="100%" height={H + 24} viewBox={`0 0 ${W} ${H + 24}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="bpmLineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--chart-1))" stopOpacity="0.3" />
          <stop offset="100%" stopColor="hsl(var(--chart-1))" stopOpacity="0" />
        </linearGradient>
        <clipPath id="bpmChartClip">
          <rect x="0" y="0" width={drawn ? W : 0} height={H} style={{ transition: 'width 0.8s ease' }} />
        </clipPath>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(p => (
        <line key={p} x1="0" y1={H * p} x2={W} y2={H * p}
          stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />
      ))}
      <path d={area} fill="url(#bpmLineGrad)" clipPath="url(#bpmChartClip)" />
      <path d={path} fill="none" stroke="hsl(var(--chart-1))" strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round" clipPath="url(#bpmChartClip)" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" fill="hsl(var(--chart-1))" clipPath="url(#bpmChartClip)" />
      ))}
      {pts.map(([x], i) => i % Math.ceil(pts.length / 5) === 0 ? (
        <text key={i} x={x} y={H + 18} fontSize="8.5" fill="hsl(var(--muted-foreground,220 10% 50%))"
          fontFamily="monospace" textAnchor="middle">
          {segments[i]?.start_seconds != null ? `${Math.floor(segments[i].start_seconds / 60)}:${String(Math.floor(segments[i].start_seconds % 60)).padStart(2, '0')}` : ''}
        </text>
      ) : null)}
    </svg>
  )
}

function PoincareChart({ bpms, delay = 0 }: { bpms: number[]; delay?: number }) {
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), delay); return () => clearTimeout(t) }, [delay])
  if (bpms.length < 2) return null
  const W = 200, H = 200
  const min = Math.min(...bpms) - 5
  const max = Math.max(...bpms) + 5
  const range = max - min || 1
  const pts = bpms.slice(1).map((b, i) => ({
    x: ((bpms[i] - min) / range) * W,
    y: H - ((b - min) / range) * H,
  }))

  return (
    <div>
      <div className="text-label" style={{ marginBottom: 10 }}>Poincaré Plot</div>
      <svg width="100%" viewBox={`0 0 ${W + 24} ${H + 24}`}>
        <line x1="0" y1={H} x2={W} y2="0" stroke="hsl(var(--border))" strokeWidth="1" strokeDasharray="4 4" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={shown ? 3 : 0} fill="hsl(var(--chart-1))" opacity="0.7"
            style={{ transition: `r 0.3s ease ${delay + i * 20}ms` }} />
        ))}
        <text x={W / 2} y={H + 16} fontSize="8.5" fill="hsl(var(--muted-foreground,220 10% 50%))"
          fontFamily="monospace" textAnchor="middle">RRn (BPM)</text>
      </svg>
    </div>
  )
}

function RhythmTimeline({ segments, totalFrames, fps, delay = 0 }: {
  segments: RhythmicSegment[]; totalFrames: number; fps: number; delay?: number
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => { const t = setTimeout(() => setShown(true), delay); return () => clearTimeout(t) }, [delay])
  if (!segments.length) return null

  const minBpm = Math.min(...segments.map(s => s.bpm))
  const maxBpm = Math.max(...segments.map(s => s.bpm))
  const bpmRange = maxBpm - minBpm || 1

  const fmtTS = (frames: number) => {
    const secs = frames / fps
    const m = Math.floor(secs / 60)
    return `${m}:${String(Math.floor(secs % 60)).padStart(2, '0')}`
  }

  return (
    <div>
      <div style={{ position: 'relative', height: 52, background: 'var(--tl-track, hsl(var(--muted)/0.3))', borderRadius: 6, overflow: 'hidden' }}>
        {segments.map((seg, i) => {
          const leftPct = (seg.start_frame / totalFrames) * 100
          const widthPct = ((seg.end_frame - seg.start_frame) / totalFrames) * 100
          const intensity = (seg.bpm - minBpm) / bpmRange
          return (
            <div key={i} style={{
              position: 'absolute',
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              top: 0, bottom: 0,
              background: `hsl(var(--chart-1)/${0.3 + intensity * 0.55})`,
              opacity: shown ? 1 : 0,
              transition: `opacity 0.3s ease ${delay + i * 30}ms`,
              borderRight: i < segments.length - 1 ? '1px solid var(--border-c)' : 'none',
            }}>
              {widthPct > 8 && (
                <span style={{ position: 'absolute', top: '50%', left: 6, transform: 'translateY(-50%)', fontSize: 9, fontFamily: 'monospace', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                  {seg.bpm.toFixed(1)}
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(p => (
          <span key={p} style={{ fontFamily: 'monospace', fontSize: 9.5, color: 'var(--text-3)' }}>
            {fmtTS(Math.round(p * totalFrames))}
          </span>
        ))}
      </div>
    </div>
  )
}

function PlaybackSpeedCalc({ bpm }: { bpm: number }) {
  return (
    <div>
      <div className="text-label" style={{ marginBottom: 10 }}>Playback Speed Calculator</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map(s => (
          <div key={s} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '7px 12px', borderRadius: 7,
            background: s === 1 ? 'var(--ac-muted)' : 'var(--elevated)',
            border: `1px solid ${s === 1 ? 'var(--border-ac)' : 'var(--border-c)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: s === 1 ? 'var(--ac)' : 'var(--text-2)', width: 30 }}>{s}×</span>
              <div style={{ width: Math.round(s * 56), height: 3, borderRadius: 2, background: s === 1 ? 'var(--ac)' : 'var(--border-c)' }} />
            </div>
            <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--fg)' }}>
              {(bpm * s).toFixed(1)}{' '}
              <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-2)' }}>bpm</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

const StatisticsPage: React.FC = () => {
  const { videoId = '' } = useParams<{ videoId: string }>()
  const navigate = useNavigate()
  const { data: video, isLoading: videoLoading } = useVideo(videoId)
  const { data: stats, isLoading: statsLoading } = useVideoStatistics(videoId)

  const isLoading = videoLoading || statsLoading
  const segments = stats?.rhythmic_segments ?? []
  const segmentBpms = segments.map(s => s.bpm)
  const intervalDist = stats?.interval_distribution ?? []

  const bpmInMs = intervalDist.map(v => (v > 0 ? 60000 / v : 0)).filter(v => v > 0 && v < 300)
  const histValues = bpmInMs.length > 0 ? bpmInMs : segmentBpms

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
        <header className="topbar"><Logo /></header>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--text-2)' }}>
          <Spinner /> Chargement…
        </div>
      </div>
    )
  }

  const hasStats = stats && !stats.error && stats.bpm_global > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg)' }}>
      <header className="topbar">
        <button className="btn btn-ghost btn-sm" onClick={() => video ? navigate(`/projects/${video.project_id}`) : navigate('/projects')} style={{ gap: 5 }}>
          <Icon.Back /> Projet
        </button>
        <span style={{ color: 'var(--text-3)', fontSize: 14 }}>/</span>
        <Breadcrumb items={[
          { label: 'Projets', onClick: () => navigate('/projects') },
          { label: video?.original_name ?? video?.filename ?? 'Vidéo', onClick: () => video ? navigate(`/projects/${video.project_id}`) : undefined },
          { label: 'Statistiques' },
        ]} />
        <div style={{ flex: 1 }} />
        <ThemeToggle />
      </header>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {!hasStats ? (
          <EmptyState
            icon={<Icon.Stats />}
            title="Pas assez d'annotations"
            description={stats?.error ?? "Ajoutez au moins 2 annotations pour calculer les statistiques BPM."}
            action={
              <button className="btn btn-primary" onClick={() => video ? navigate(`/annotation/${videoId}`) : navigate('/projects')}>
                <Icon.Back /> Retour à l'annotation
              </button>
            }
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Hero row */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
              {/* BPM Hero card */}
              <div className="card" style={{ padding: '24px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 40%, hsl(var(--chart-1)/0.12), transparent 65%)', pointerEvents: 'none' }} />
                <div className="text-label" style={{ marginBottom: 14 }}>BPM Global</div>
                <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 72, fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, marginBottom: 8, color: 'hsl(var(--chart-1))', animation: 'staggerFadeUp 0.4s ease both' }}>
                  {stats.bpm_global.toFixed(1)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 18 }}>beats per minute</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    ['Moyenne', `${stats.bpm_mean.toFixed(2)} bpm`],
                    ['Médiane', `${stats.bpm_median.toFixed(2)} bpm`],
                    ['Écart-type', `±${(stats.interval_std_seconds * 60000 / (60000 / stats.bpm_mean || 1)).toFixed(2)}`],
                    ['Variation', `${stats.bpm_variation.toFixed(1)}%`],
                  ].map(([l, v]) => (
                    <div key={l} style={{ borderTop: '1px solid var(--border-c)', paddingTop: 10 }}>
                      <div className="text-label" style={{ fontSize: 9, marginBottom: 3 }}>{l}</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 600 }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stat cards grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, alignContent: 'start' }}>
                <StatCard label="Annotations" value={video?.annotations?.length ?? 0} delay={50} />
                <StatCard label="Densité/min" value={stats.annotation_density_per_minute.toFixed(1)} unit="/min" delay={100} />
                <StatCard label="Intervalle moyen" value={stats.bpm_global > 0 ? (60000 / stats.bpm_global).toFixed(0) : '--'} unit="ms" delay={150} />
                <StatCard label="Min BPM" value={segmentBpms.length ? Math.min(...segmentBpms).toFixed(1) : '--'} accent="hsl(var(--chart-2,130 60% 55%))" delay={200} />
                <StatCard label="Max BPM" value={segmentBpms.length ? Math.max(...segmentBpms).toFixed(1) : '--'} accent="hsl(var(--chart-3,0 70% 60%))" delay={250} />
                <StatCard label="Segments" value={segments.length} delay={300} />
              </div>
            </div>

            {/* Rhythm timeline */}
            {segments.length > 0 && video && (
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="text-label" style={{ marginBottom: 14 }}>Timeline des Segments Rythmiques</div>
                <RhythmTimeline
                  segments={segments}
                  totalFrames={video.total_frames}
                  fps={video.fps}
                  delay={100}
                />
              </div>
            )}

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="text-label" style={{ marginBottom: 14 }}>Évolution du BPM</div>
                <BPMLineChart segments={segments} delay={150} />
              </div>
              <div className="card" style={{ padding: '18px 20px' }}>
                <div className="text-label" style={{ marginBottom: 14 }}>Distribution des Intervalles</div>
                {histValues.length > 1 ? (
                  <Histogram values={histValues} delay={200} />
                ) : (
                  <div style={{ color: 'var(--text-2)', fontSize: 12 }}>Pas assez de données.</div>
                )}
              </div>
            </div>

            {/* Bottom row */}
            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16 }}>
              <div className="card" style={{ padding: '18px 20px' }}>
                {segmentBpms.length >= 2 ? (
                  <PoincareChart bpms={segmentBpms} delay={300} />
                ) : (
                  <div>
                    <div className="text-label" style={{ marginBottom: 10 }}>Poincaré Plot</div>
                    <div style={{ color: 'var(--text-2)', fontSize: 12 }}>Pas assez de segments.</div>
                  </div>
                )}
              </div>
              <div className="card" style={{ padding: '18px 20px' }}>
                <PlaybackSpeedCalc bpm={stats.bpm_global} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default StatisticsPage
