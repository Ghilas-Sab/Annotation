import { useParams, Link } from 'react-router-dom'
import { useVideo } from '../api/projects'
import { useVideoStatistics } from '../api/statistics'
import BpmMetrics from '../components/statistics/BpmMetrics'
import BpmTimeline from '../components/statistics/BpmTimeline'
import IntervalHistogram from '../components/statistics/IntervalHistogram'
import PoincareChart from '../components/statistics/PoincareChart'

const panel: React.CSSProperties = {
  background: 'var(--color-panel, #13132a)',
  border: '1px solid var(--color-border, #2a2a4a)',
  borderRadius: '8px',
  padding: '1.5rem',
  marginBottom: '1.5rem',
}

function StatisticsPage() {
  const { videoId = '' } = useParams<{ videoId: string }>()
  const { data: video, isLoading } = useVideo(videoId)
  const { data: stats } = useVideoStatistics(videoId)

  const dist = stats?.interval_distribution ?? []
  const segments = stats?.rhythmic_segments ?? []

  return (
    <>
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>

      {/* Breadcrumb */}
      <nav style={{ marginBottom: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-secondary, #aaa)' }}>
        <Link to="/projects" style={{ color: 'var(--color-accent, #7aa2f7)', textDecoration: 'none' }}>
          Projets
        </Link>
        {' › '}
        <span>Statistiques</span>
        {video && (
          <>
            {' › '}
            <span style={{ color: 'var(--color-text, #cdd6f4)' }}>{video.filename}</span>
          </>
        )}
      </nav>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
          Statistiques rythmiques
          {isLoading && (
            <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary, #aaa)', marginLeft: '1rem' }}>
              Chargement…
            </span>
          )}
        </h1>
      </div>

      {/* 1 — Métriques résumées */}
      <div style={panel}>
        <BpmMetrics videoId={videoId} />
      </div>

      {/* 2 — Évolution du BPM */}
      <div style={panel}>
        <BpmTimeline
          segments={segments}
          bpmGlobal={stats?.bpm_global ?? 0}
          bpmVariation={stats?.bpm_variation ?? 0}
        />
      </div>

      {/* 3 — Distribution des intervalles */}
      <div style={panel}>
        <IntervalHistogram
          distribution={dist}
          bpmMean={stats?.bpm_mean}
          bpmMedian={stats?.bpm_median}
        />
      </div>

      {/* 4 — Diagramme de Poincaré */}
      <div style={panel}>
        <PoincareChart distribution={dist} />
      </div>

    </div>
    </>
  )
}

export default StatisticsPage
