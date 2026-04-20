import { describe, test, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CategorySelector } from './CategorySelector'

const categories = [
  { id: 'c1', name: 'Beat', color: '#FF0000', video_id: 'v1', created_at: '' },
  { id: 'c2', name: 'Temps fort', color: '#0000FF', video_id: 'v1', created_at: '' },
]

describe('CategorySelector', () => {
  test('renders category list with color badges', () => {
    render(<CategorySelector categories={categories} value="c1" onChange={vi.fn()} />)
    expect(screen.getByText('Beat')).toBeInTheDocument()
    expect(screen.getByText('Temps fort')).toBeInTheDocument()
  })

  test('calls onChange when category selected', async () => {
    const onChange = vi.fn()
    render(<CategorySelector categories={categories} value="c1" onChange={onChange} />)
    await userEvent.selectOptions(screen.getByRole('combobox'), 'c2')
    expect(onChange).toHaveBeenCalledWith('c2')
  })

  test('shows current value as selected', () => {
    render(<CategorySelector categories={categories} value="c2" onChange={vi.fn()} />)
    const select = screen.getByRole('combobox') as HTMLSelectElement
    expect(select.value).toBe('c2')
  })

  test('has an aria-label', () => {
    render(<CategorySelector categories={categories} value="c1" onChange={vi.fn()} />)
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-label')
  })
})
