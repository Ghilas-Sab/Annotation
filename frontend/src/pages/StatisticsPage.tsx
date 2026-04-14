import { useParams, Link } from 'react-router-dom'
import { useVideo } from '../api/projects'
import BpmMetrics from '../components/statistics/BpmMetrics'

function StatisticsPage() {
  const { videoId = '' } = useParams<{ videoId: string }>()
  const { data: video, isLoading } = useVideo(videoId)

  return (
    <div className="container" style={{ padding: '2rem' }}>
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

      {/* Titre */}
      <h1 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>
        Statistiques rythmiques
        {isLoading && <span style={{ fontSize: '1rem', color: 'var(--color-text-secondary, #aaa)', marginLeft: '1rem' }}>Chargement…</span>}
      </h1>

      {/* Métriques BPM */}
      <section style={{ marginBottom: '2rem' }}>
        <BpmMetrics videoId={videoId} />
      </section>

      {/* Emplacement réservé pour 4.4 : histogramme + ajusteur */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <div id="interval-histogram-panel" style={{ flex: 1, minWidth: '280px' }} />
        <div id="bpm-adjuster-panel" style={{ flex: 1, minWidth: '280px' }} />
      </div>
    </div>
  )
}

export default StatisticsPage
