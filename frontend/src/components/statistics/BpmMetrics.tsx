import { useVideoStatistics } from '../../api/statistics'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
}

function MetricCard({ label, value, unit }: MetricCardProps) {
  return (
    <div style={{
      background: 'var(--color-surface, #1e1e2e)',
      border: '1px solid var(--color-border, #333)',
      borderRadius: '8px',
      padding: '1rem 1.5rem',
      minWidth: '140px',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'monospace',
        fontSize: '2rem',
        fontWeight: 'bold',
        color: 'var(--color-accent, #7aa2f7)',
        lineHeight: 1.1,
      }}>
        {value}{unit && <span style={{ fontSize: '1rem', marginLeft: '4px' }}>{unit}</span>}
      </div>
      <div style={{
        fontSize: '0.75rem',
        color: 'var(--color-text-secondary, #aaa)',
        marginTop: '0.4rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {label}
      </div>
    </div>
  )
}

interface BpmMetricsProps {
  videoId: string
}

export default function BpmMetrics({ videoId }: BpmMetricsProps) {
  const { data, isLoading, isError } = useVideoStatistics(videoId)

  if (isLoading) {
    return <div style={{ color: 'var(--color-text-secondary, #aaa)' }}>Chargement des statistiques…</div>
  }

  if (isError) {
    return <div style={{ color: 'var(--color-error, #f7768e)' }}>Erreur lors du chargement des statistiques.</div>
  }

  if (data?.error) {
    return (
      <div style={{ color: 'var(--color-text-secondary, #aaa)', fontStyle: 'italic' }}>
        {data.error}
      </div>
    )
  }

  if (!data) return null

  const fmt = (n: number, d = 1) => n.toFixed(d)

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
      <MetricCard label="BPM global" value={fmt(data.bpm_global)} unit="bpm" />
      <MetricCard label="BPM moyen" value={fmt(data.bpm_mean)} unit="bpm" />
      <MetricCard label="BPM médian" value={fmt(data.bpm_median)} unit="bpm" />
      <MetricCard label="Variation BPM" value={fmt(data.bpm_variation)} unit="bpm" />
      <MetricCard label="Écart-type intervalle" value={fmt(data.interval_std_seconds, 3)} unit="s" />
      <MetricCard label="Densité / min" value={fmt(data.annotation_density_per_minute)} />
    </div>
  )
}
