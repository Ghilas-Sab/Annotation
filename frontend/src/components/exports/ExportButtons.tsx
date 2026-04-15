import React, { useState } from 'react'
import { downloadExportJson, downloadExportCsv, downloadExportVideo } from '../../api/exports'

interface ExportButtonsProps {
  videoId: string
  annotationCount: number
}

type ExportType = 'json' | 'csv' | 'video'

const ExportButtons: React.FC<ExportButtonsProps> = ({ videoId, annotationCount }) => {
  const [loading, setLoading] = useState<ExportType | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const handleExport = async (type: ExportType) => {
    setLoading(type)
    try {
      if (type === 'json') await downloadExportJson(videoId)
      else if (type === 'csv') await downloadExportCsv(videoId)
      else await downloadExportVideo(videoId)
      showToast(`Export ${type.toUpperCase()} réussi`)
    } catch {
      showToast(`Erreur export ${type.toUpperCase()}`)
    } finally {
      setLoading(null)
    }
  }

  const btnStyle: React.CSSProperties = {
    fontSize: '0.78rem',
    padding: '0.2rem 0.6rem',
    borderRadius: 4,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.05)',
    color: 'var(--color-text, #e0e0e0)',
  }

  return (
    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
      <button
        onClick={() => handleExport('json')}
        disabled={loading !== null}
        style={btnStyle}
      >
        {loading === 'json' ? '⏳ JSON' : '⬇ JSON'}
      </button>
      <button
        onClick={() => handleExport('csv')}
        disabled={loading !== null}
        style={btnStyle}
      >
        {loading === 'csv' ? '⏳ CSV' : '⬇ CSV'}
      </button>
      <button
        onClick={() => handleExport('video')}
        disabled={loading !== null || annotationCount < 2}
        style={btnStyle}
      >
        {loading === 'video' ? '⏳ Vidéo' : '⬇ Vidéo'}
      </button>
      {toast && (
        <span style={{ fontSize: '0.72rem', color: 'var(--color-accent, #e94560)', whiteSpace: 'nowrap' }}>
          {toast}
        </span>
      )}
    </div>
  )
}

export default ExportButtons
