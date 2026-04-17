import React from 'react'

interface Props {
  onClose: () => void
}

const shortcuts = [
  { keys: '←  →', desc: 'Frame précédente / suivante' },
  { keys: 'Shift + ←  →', desc: '−5 / +5 frames' },
  { keys: 'Ctrl + ←  →', desc: 'Saut inter-annotation (fallback 10)' },
  { keys: 'Espace', desc: 'Créer une annotation sur la frame courante' },
  { keys: 'Ctrl + Z', desc: 'Annuler la dernière annotation créée' },
]

export const KeyboardShortcutsModal: React.FC<Props> = ({ onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Raccourcis clavier"
      onClick={e => e.stopPropagation()}
      style={{
        backgroundColor: 'var(--color-panel, #1a1a2e)',
        border: '1px solid var(--color-surface, #2a2a3e)',
        borderRadius: 10, padding: '1.5rem', minWidth: 360, maxWidth: 480,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--color-text, #e0e0e0)' }}>⌨ Raccourcis clavier</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted, #888)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {shortcuts.map(({ keys, desc }) => (
            <tr key={keys} style={{ borderBottom: '1px solid var(--color-surface, #2a2a3e)' }}>
              <td style={{ padding: '0.5rem 0.75rem 0.5rem 0', whiteSpace: 'nowrap' }}>
                {keys.split('  ').map((k, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span style={{ color: 'var(--color-text-muted, #888)', margin: '0 4px' }}>/</span>}
                    <kbd style={{
                      padding: '2px 6px', border: '1px solid #555', borderRadius: 4,
                      fontSize: '0.78rem', backgroundColor: 'rgba(255,255,255,0.06)',
                      color: 'var(--color-text, #e0e0e0)', fontFamily: 'monospace',
                    }}>{k}</kbd>
                  </React.Fragment>
                ))}
              </td>
              <td style={{ padding: '0.5rem 0', fontSize: '0.85rem', color: 'var(--color-text-muted, #aaa)' }}>
                {desc}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: 'var(--color-text-muted, #666)' }}>
        Les raccourcis sont désactivés quand le curseur est dans un champ texte.
      </div>
      <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-text-muted, #666)' }}>
        <strong>Timeline :</strong> clic pour naviguer · glisser un marqueur rouge pour déplacer une annotation.
      </div>
    </div>
  </div>
)
