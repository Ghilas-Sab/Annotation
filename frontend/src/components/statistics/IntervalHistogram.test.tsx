import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import IntervalHistogram from './IntervalHistogram'

describe('IntervalHistogram', () => {
  it('renders a canvas element', () => {
    render(<IntervalHistogram distribution={[0.47, 0.48, 0.46]} />)
    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  it('renders without crashing when distribution is empty', () => {
    render(<IntervalHistogram distribution={[]} />)
    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  it('displays a section label', () => {
    render(<IntervalHistogram distribution={[0.47, 0.48]} />)
    expect(screen.getByText(/intervalles/i)).toBeInTheDocument()
  })
})
