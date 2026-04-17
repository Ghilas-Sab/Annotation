import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PoincareChart from './PoincareChart'

describe('PoincareChart', () => {
  test('affiche le titre', () => {
    render(<PoincareChart distribution={[]} />)
    expect(screen.getByText(/diagramme de poincaré/i)).toBeInTheDocument()
  })

  test('affiche le texte explicatif', () => {
    render(<PoincareChart distribution={[]} />)
    expect(screen.getByText(/nuage serré/i)).toBeInTheDocument()
  })

  test('rend un canvas', () => {
    render(<PoincareChart distribution={[]} />)
    const canvas = document.querySelector('canvas')
    expect(canvas).toBeInTheDocument()
  })

  test('canvas avec aria-label', () => {
    render(<PoincareChart distribution={[]} />)
    const canvas = document.querySelector('canvas')
    expect(canvas?.getAttribute('aria-label')).toMatch(/poincaré/i)
  })

  test('rend sans erreur avec distribution vide', () => {
    expect(() => render(<PoincareChart distribution={[]} />)).not.toThrow()
  })

  test('rend sans erreur avec un seul intervalle (< 2)', () => {
    expect(() => render(<PoincareChart distribution={[0.48]} />)).not.toThrow()
  })

  test('rend sans erreur avec deux intervalles', () => {
    expect(() => render(<PoincareChart distribution={[0.47, 0.48]} />)).not.toThrow()
  })

  test('rend sans erreur avec beaucoup d\'intervalles', () => {
    const distribution = Array.from({ length: 50 }, (_, i) => 0.45 + i * 0.002)
    expect(() => render(<PoincareChart distribution={distribution} />)).not.toThrow()
  })

  test('rend sans erreur avec valeurs identiques (span = 0)', () => {
    expect(() => render(<PoincareChart distribution={[0.5, 0.5, 0.5]} />)).not.toThrow()
  })

  test('rend sans erreur avec valeurs > 1 seconde (label en s)', () => {
    expect(() => render(<PoincareChart distribution={[1.2, 1.3, 1.1]} />)).not.toThrow()
  })

  test('rend sans erreur avec valeurs < 1 seconde (label en ms)', () => {
    expect(() => render(<PoincareChart distribution={[0.45, 0.46, 0.47]} />)).not.toThrow()
  })
})
