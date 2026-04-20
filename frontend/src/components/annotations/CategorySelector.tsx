import React from 'react'
import type { Category } from '../../types/annotation'

interface CategorySelectorProps {
  categories: Category[]
  value: string
  onChange: (id: string) => void
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({ categories, value, onChange }) => {
  return (
    <select
      aria-label="Catégorie"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '0.3rem 0.5rem',
        borderRadius: '4px',
        border: '1px solid var(--color-surface)',
        backgroundColor: 'var(--color-panel)',
        color: 'var(--color-text)',
        fontSize: '0.85rem',
        cursor: 'pointer',
      }}
    >
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ))}
    </select>
  )
}
