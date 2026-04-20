import React, { useState } from 'react'
import { useCategories, useCreateCategory, useDeleteCategory } from '../../api/annotations'

const DEFAULT_COLOR = '#3B82F6'

interface CategoryManagerProps {
  videoId: string
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ videoId }) => {
  const [newName, setNewName] = useState('')
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR)
  const [validationError, setValidationError] = useState('')

  const { data: categories = [] } = useCategories(videoId)
  const createMutation = useCreateCategory(videoId)
  const deleteMutation = useDeleteCategory()

  const handleAdd = async () => {
    if (!newName.trim()) return
    const trimmed = newName.trim()
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setValidationError('Ce nom est déjà utilisé par une autre catégorie.')
      return
    }
    if (categories.some(c => c.color.toLowerCase() === selectedColor.toLowerCase())) {
      setValidationError('Cette couleur est déjà utilisée par une autre catégorie.')
      return
    }
    setValidationError('')
    await createMutation.mutateAsync({ name: trimmed, color: selectedColor })
    setNewName('')
    setSelectedColor(DEFAULT_COLOR)
  }

  const handleDelete = async (categoryId: string) => {
    await deleteMutation.mutateAsync(categoryId)
  }

  return (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <h3 style={{ fontSize: '0.9rem', margin: 0, color: 'var(--color-text)' }}>Catégories</h3>

      {/* Liste des catégories */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {categories.map((cat) => (
          <div
            key={cat.id}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.35rem 0.5rem', borderRadius: '4px',
              backgroundColor: 'var(--color-surface)',
            }}
          >
            <span
              data-testid="category-color-badge"
              style={{
                display: 'inline-block', width: '14px', height: '14px',
                borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            />
            <span style={{ flex: 1, fontSize: '0.85rem', color: 'var(--color-text)' }}>
              {cat.name}
            </span>
            {cat.name !== 'Par défaut' && (
              <button
                aria-label="Supprimer la catégorie"
                onClick={() => handleDelete(cat.id)}
                disabled={deleteMutation.isPending}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-danger, #e94560)', fontSize: '0.8rem', padding: '2px 4px',
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--color-surface)', paddingTop: '0.75rem' }}>
        <input
          type="text"
          placeholder="Nom de la catégorie"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setValidationError('') }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          style={{
            padding: '0.4rem 0.5rem', borderRadius: '4px',
            border: '1px solid var(--color-surface)',
            backgroundColor: 'var(--color-panel)', color: 'var(--color-text)',
            fontSize: '0.85rem',
          }}
        />

        {/* Color picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label htmlFor="cat-color-picker" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
            Couleur
          </label>
          <input
            id="cat-color-picker"
            type="color"
            aria-label="Couleur"
            value={selectedColor}
            onChange={(e) => { setSelectedColor(e.target.value); setValidationError('') }}
            style={{ width: '36px', height: '28px', padding: '1px 2px', borderRadius: '4px', border: '1px solid var(--color-surface)', cursor: 'pointer', backgroundColor: 'transparent' }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{selectedColor}</span>
        </div>

        {validationError && (
          <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--color-danger, #e94560)' }}>
            {validationError}
          </p>
        )}
        <button
          onClick={handleAdd}
          disabled={createMutation.isPending || !newName.trim()}
          style={{
            padding: '0.4rem 0.75rem', borderRadius: '4px',
            border: 'none', cursor: 'pointer',
            backgroundColor: 'var(--color-accent)', color: '#fff',
            fontSize: '0.85rem',
            opacity: !newName.trim() ? 0.5 : 1,
          }}
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}
