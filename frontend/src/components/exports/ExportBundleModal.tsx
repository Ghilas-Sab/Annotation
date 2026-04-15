import React, { useState } from 'react'
import { downloadExportBundle } from '../../api/exports'

interface ExportBundleModalProps {
  videoId: string
  currentBpm: number
  annotationCount: number
  onClose: () => void
}

// ── Segmented control générique ────────────────────────────────────────────
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string; disabledReason?: string }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div style={{
      display: 'flex',
      borderRadius: 8,
      border: '1px solid rgba(255,255,255,0.1)',
      overflow: 'hidden',
      background: 'rgba(0,0,0,0.2)',
    }}>
      {options.map((opt, i) => {
        const active = opt.value === value
        const isDisabled = disabled || !!opt.disabledReason
        return (
          <button
            key={opt.value}
            title={opt.disabledReason}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(opt.value)}
            aria-label={opt.label}
            style={{
              flex: 1,
              padding: '0.5rem 0.75rem',
              fontSize: '0.82rem',
              fontWeight: active ? 600 : 400,
              border: 'none',
              borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, color 0.15s',
              background: active
                ? 'var(--color-accent, #e94560)'
                : 'transparent',
              color: active
                ? '#fff'
                : isDisabled
                  ? 'rgba(136,146,176,0.4)'
                  : 'var(--color-text-muted, #8892b0)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Modal principal ────────────────────────────────────────────────────────
const ExportBundleModal: React.FC<ExportBundleModalProps> = ({
  videoId,
  currentBpm,
  annotationCount,
  onClose,
}) => {
  const [targetBpm, setTargetBpm] = useState(Math.round(currentBpm) || 120)
  const [clipOnly, setClipOnly] = useState(false)
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const speedRatio = currentBpm > 0 ? targetBpm / currentBpm : null

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      await downloadExportBundle(videoId, { targetBpm, clipOnly, format })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de l'export")
    } finally {
      setLoading(false)
    }
  }

  // ── Styles réutilisables ─────────────────────────────────────────────────
  const section: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.55rem',
  }
  const sectionLabel: React.CSSProperties = {
    fontSize: '0.72rem',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: 'var(--color-text-muted, #8892b0)',
  }
  const divider: React.CSSProperties = {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '0.1rem 0',
  }

  return (
    <div
      data-testid="bundle-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(10,10,20,0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      {/* Boîte modale */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-panel, #16213e)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderTop: '3px solid var(--color-accent, #e94560)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: 420,
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          overflow: 'hidden',
        }}
      >
        {/* En-tête */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.1rem 1.4rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text, #eaeaea)' }}>
              Export complet
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted, #8892b0)', marginTop: '0.15rem' }}>
              ZIP · annotations + statistiques + vidéo
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted, #8892b0)',
              fontSize: '1.2rem', lineHeight: 1, padding: '0.2rem 0.4rem',
              borderRadius: 4, cursor: 'pointer',
            }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Corps */}
        <div style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>

          {/* ── BPM cible ── */}
          <div style={section}>
            <span style={sectionLabel}>BPM cible</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                id="target-bpm"
                type="number"
                min={1}
                step={1}
                value={targetBpm}
                onChange={e => setTargetBpm(Number(e.target.value))}
                aria-label="BPM cible"
                style={{
                  width: 88,
                  padding: '0.5rem 0.7rem',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 7,
                  color: 'var(--color-text, #eaeaea)',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted, #8892b0)', lineHeight: 1.5 }}>
                <div>actuel&nbsp;:&nbsp;
                  <span style={{ color: 'var(--color-text, #eaeaea)', fontFamily: 'monospace' }}>
                    {currentBpm.toFixed(1)} BPM
                  </span>
                </div>
                {speedRatio !== null && (
                  <div>
                    vitesse&nbsp;:&nbsp;
                    <span style={{
                      fontFamily: 'JetBrains Mono, monospace',
                      fontWeight: 700,
                      color: speedRatio > 1
                        ? 'var(--color-success, #64ffda)'
                        : speedRatio < 1
                          ? 'var(--color-accent2, #f5a623)'
                          : 'var(--color-text-muted, #8892b0)',
                    }}>
                      ×{speedRatio.toFixed(2)}
                    </span>
                    {speedRatio > 1 ? ' (accéléré)' : speedRatio < 1 ? ' (ralenti)' : ' (inchangé)'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={divider} />

          {/* ── Étendue vidéo ── */}
          <div style={section}>
            <span style={sectionLabel}>Étendue vidéo</span>
            <SegmentedControl
              options={[
                { value: 'full', label: 'Vidéo complète' },
                {
                  value: 'clip',
                  label: 'Partie annotée',
                  disabledReason: annotationCount < 2 ? 'Minimum 2 annotations requises' : undefined,
                },
              ]}
              value={clipOnly ? 'clip' : 'full'}
              onChange={v => setClipOnly(v === 'clip')}
            />
            {annotationCount < 2 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted, #8892b0)', paddingLeft: '0.2rem' }}>
                La partie annotée nécessite au moins 2 annotations.
              </div>
            )}
          </div>

          <div style={divider} />

          {/* ── Format données ── */}
          <div style={section}>
            <span style={sectionLabel}>Format données</span>
            <SegmentedControl
              options={[
                { value: 'json', label: 'JSON' },
                { value: 'csv', label: 'CSV' },
              ]}
              value={format}
              onChange={setFormat}
            />
          </div>

          <div style={divider} />

          {/* ── Contenu du ZIP ── */}
          <div style={{
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 8,
            padding: '0.8rem 1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}>
            <div style={{ fontSize: '0.7rem', ...sectionLabel, marginBottom: '0.2rem' }}>Contenu du ZIP</div>
            {[
              { icon: '📄', name: `annotations.${format}` },
              { icon: '📊', name: `statistics.${format}` },
              { icon: '🎬', name: 'video_adjusted.mp4' },
            ].map(f => (
              <div key={f.name} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.8rem', color: 'var(--color-text-muted, #8892b0)',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                <span>{f.icon}</span>
                <span>{f.name}</span>
              </div>
            ))}
          </div>

          {/* ── Erreur ── */}
          {error && (
            <div style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
              padding: '0.65rem 0.9rem',
              background: 'rgba(255,107,107,0.1)',
              border: '1px solid rgba(255,107,107,0.3)',
              borderRadius: 7, fontSize: '0.82rem',
              color: 'var(--color-danger, #ff6b6b)',
            }}>
              <span style={{ flexShrink: 0 }}>⚠</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Pied de page */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '0.65rem',
          padding: '1rem 1.4rem',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.1rem', fontSize: '0.85rem', fontWeight: 500,
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 7,
              color: 'var(--color-text-muted, #8892b0)',
              cursor: 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || targetBpm <= 0}
            style={{
              padding: '0.5rem 1.3rem', fontSize: '0.85rem', fontWeight: 700,
              background: 'var(--color-accent, #e94560)',
              border: 'none',
              borderRadius: 7,
              color: '#fff',
              cursor: loading || targetBpm <= 0 ? 'not-allowed' : 'pointer',
              opacity: loading || targetBpm <= 0 ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              transition: 'opacity 0.15s',
            }}
          >
            {loading
              ? <><span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span> Export…</>
              : <><span>⬇</span> Exporter</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

export default ExportBundleModal
