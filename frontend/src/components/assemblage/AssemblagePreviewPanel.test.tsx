import React from 'react'
import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AssemblagePreviewPanel from './AssemblagePreviewPanel'
import type { AssemblageClip } from '../../stores/assemblageStore'

const buildClip = (overrides: Partial<AssemblageClip> = {}): AssemblageClip => ({
  id: `clip-${Math.random().toString(36).slice(2, 8)}`,
  videoId: 'v1',
  projectId: 'p1',
  name: 'clip1.mp4',
  duration: 10,
  ...overrides,
})

const clips = [
  buildClip({ id: 'c1', name: 'Scene 1.mp4', duration: 10 }),
  buildClip({ id: 'c2', name: 'Scene 2.mp4', duration: 20 }),
  buildClip({ id: 'c3', name: 'Scene 3.mp4', duration: 5 }),
]

beforeEach(() => {
  // Mock HTMLVideoElement.play and load
  HTMLVideoElement.prototype.play = vi.fn().mockResolvedValue(undefined)
  HTMLVideoElement.prototype.load = vi.fn()
  Object.defineProperty(HTMLVideoElement.prototype, 'src', {
    set: vi.fn(),
    get: vi.fn().mockReturnValue(''),
    configurable: true,
  })
})

describe('AssemblagePreviewPanel — rendering', () => {
  test('renders panel with clip count in header', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    expect(screen.getByText(/3 clips/i)).toBeInTheDocument()
  })

  test('shows total duration in header', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    // total = 35s — appears in the header text
    expect(screen.getByText(/Durée totale/)).toBeInTheDocument()
  })

  test('renders clip names in sidebar', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    // each name appears at least once (also in player section for active clip)
    expect(screen.getAllByText('Scene 1.mp4').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Scene 2.mp4').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Scene 3.mp4').length).toBeGreaterThanOrEqual(1)
  })

  test('shows current clip position indicator', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    // "Clip 1/3" appears in the header as part of "· Clip 1/3"
    expect(screen.getByText((content) => content.includes('Clip 1/3'))).toBeInTheDocument()
  })

  test('renders previous clip button disabled at first clip', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clip précédent/i })).toBeDisabled()
  })

  test('renders next clip button enabled when not at last clip', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /clip suivant/i })).not.toBeDisabled()
  })

  test('renders close button', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /masquer l'aperçu/i })).toBeInTheDocument()
  })

  test('renders video element', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)
    expect(document.querySelector('video')).toBeInTheDocument()
  })

  test('returns null when clips array is empty', () => {
    const { container } = render(<AssemblagePreviewPanel clips={[]} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})

describe('AssemblagePreviewPanel — navigation', () => {
  test('clicking next clip advances to second clip', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))

    expect(screen.getByText((content) => content.includes('Clip 2/3'))).toBeInTheDocument()
  })

  test('clicking prev clip returns to previous clip', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))
    expect(screen.getByText((content) => content.includes('Clip 2/3'))).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /clip précédent/i }))
    expect(screen.getByText((content) => content.includes('Clip 1/3'))).toBeInTheDocument()
  })

  test('clicking a clip in sidebar navigates to it', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    // Find the sidebar button for Scene 3.mp4
    const sidebarButtons = screen.getAllByRole('button').filter(b =>
      b.textContent?.includes('Scene 3.mp4')
    )
    fireEvent.click(sidebarButtons[0])

    expect(screen.getByText((content) => content.includes('Clip 3/3'))).toBeInTheDocument()
  })

  test('next clip button is disabled at last clip', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    // Navigate to last clip
    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))
    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))

    expect(screen.getByRole('button', { name: /clip suivant/i })).toBeDisabled()
  })

  test('previous clip button is enabled when not at first clip', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))

    expect(screen.getByRole('button', { name: /clip précédent/i })).not.toBeDisabled()
  })
})

describe('AssemblagePreviewPanel — onClose', () => {
  test('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<AssemblagePreviewPanel clips={clips} onClose={onClose} />)

    fireEvent.click(screen.getByRole('button', { name: /masquer l'aperçu/i }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('AssemblagePreviewPanel — error state', () => {
  test('shows error state when video fails to load', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    const video = document.querySelector('video')
    expect(video).toBeInTheDocument()

    fireEvent.error(video!)

    expect(screen.getByText(/impossible de charger cette vidéo/i)).toBeInTheDocument()
  })

  test('retry button reloads video after error', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    const video = document.querySelector('video')!
    fireEvent.error(video)

    expect(screen.getByText(/impossible de charger cette vidéo/i)).toBeInTheDocument()

    const retryBtn = screen.getByRole('button', { name: /réessayer/i })
    fireEvent.click(retryBtn)

    // After retry, error state should be cleared
    expect(screen.queryByText(/impossible de charger cette vidéo/i)).not.toBeInTheDocument()
  })
})

describe('AssemblagePreviewPanel — single clip', () => {
  test('renders without navigation buttons issues', () => {
    const single = [buildClip({ id: 's1', name: 'Only.mp4', duration: 30 })]
    render(<AssemblagePreviewPanel clips={single} onClose={vi.fn()} />)

    expect(screen.getByText((content) => content.includes('Clip 1/1'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /clip précédent/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /clip suivant/i })).toBeDisabled()
  })
})

describe('AssemblagePreviewPanel — adapted clip', () => {
  test('adapted clip renders in the sidebar', () => {
    const adaptedClips = [
      buildClip({ id: 'a1', name: 'adapted.mp4', duration: 10, sourceType: 'adapted' }),
    ]
    render(<AssemblagePreviewPanel clips={adaptedClips} onClose={vi.fn()} />)
    // Adapted clips are displayed fine
    expect(screen.getAllByText('adapted.mp4').length).toBeGreaterThanOrEqual(1)
  })
})

describe('AssemblagePreviewPanel — video autoplay on ended', () => {
  test('advances to next clip when video ends', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    expect(screen.getByText((content) => content.includes('Clip 1/3'))).toBeInTheDocument()

    const video = document.querySelector('video')!
    fireEvent.ended(video)

    expect(screen.getByText((content) => content.includes('Clip 2/3'))).toBeInTheDocument()
  })

  test('does not advance past last clip when video ends', () => {
    render(<AssemblagePreviewPanel clips={clips} onClose={vi.fn()} />)

    // Go to last clip
    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))
    fireEvent.click(screen.getByRole('button', { name: /clip suivant/i }))

    expect(screen.getByText((content) => content.includes('Clip 3/3'))).toBeInTheDocument()

    const video = document.querySelector('video')!
    fireEvent.ended(video)

    // Should stay at last clip
    expect(screen.getByText((content) => content.includes('Clip 3/3'))).toBeInTheDocument()
  })
})
