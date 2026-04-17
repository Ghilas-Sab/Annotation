import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FrameCounter from './FrameCounter'

describe('FrameCounter', () => {
  test('affiche le numéro de frame courant et total', () => {
    render(<FrameCounter currentFrame={42} totalFrames={1000} fps={25} />)
    expect(screen.getByText(/42 \/ 1000/)).toBeInTheDocument()
  })

  test('affiche le timestamp formaté (fps > 0)', () => {
    render(<FrameCounter currentFrame={25} totalFrames={1000} fps={25} />)
    // frame 25 à 25fps = 1 seconde → "00:00:01.000"
    expect(screen.getByText(/00:00:01/)).toBeInTheDocument()
  })

  test('affiche 00:00:00.000 quand fps = 0', () => {
    render(<FrameCounter currentFrame={0} totalFrames={1000} fps={0} />)
    expect(screen.getByText(/00:00:00\.000/)).toBeInTheDocument()
  })

  test('frame 0 affiche 00:00:00.000', () => {
    render(<FrameCounter currentFrame={0} totalFrames={500} fps={30} />)
    expect(screen.getByText(/0 \/ 500/)).toBeInTheDocument()
    expect(screen.getByText(/00:00:00/)).toBeInTheDocument()
  })

  test('affiche le bon texte avec fps=30', () => {
    render(<FrameCounter currentFrame={60} totalFrames={1800} fps={30} />)
    // 60 / 30 = 2 secondes
    expect(screen.getByText(/60 \/ 1800/)).toBeInTheDocument()
    expect(screen.getByText(/00:00:02/)).toBeInTheDocument()
  })

  test('affiche correctement pour grande valeur de frame', () => {
    render(<FrameCounter currentFrame={750} totalFrames={1500} fps={25} />)
    expect(screen.getByText(/750 \/ 1500/)).toBeInTheDocument()
  })
})
