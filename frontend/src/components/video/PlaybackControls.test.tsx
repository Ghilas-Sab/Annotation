import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import PlaybackControls from './PlaybackControls'
import { useVideoStore } from '../../stores/videoStore'

beforeEach(() => {
  useVideoStore.setState({
    isPlaying: false,
    playbackRate: 1,
    currentFrame: 0, fps: 0, totalFrames: 0, duration: 0,
    videoId: null, currentVideo: null,
  })
})

const makeVideoRef = (overrides: Partial<HTMLVideoElement> = {}) => {
  const videoEl = {
    paused: true,
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    playbackRate: 1,
    ...overrides,
  } as unknown as HTMLVideoElement
  const ref = createRef<HTMLVideoElement>()
  Object.defineProperty(ref, 'current', { value: videoEl, writable: true })
  return ref
}

describe('PlaybackControls', () => {
  test('affiche le bouton Play quand non en lecture', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })

  test('affiche ▶ Play quand isPlaying = false', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    expect(screen.getByText(/▶ Play/)).toBeInTheDocument()
  })

  test('affiche ⏸ Pause quand isPlaying = true', () => {
    useVideoStore.setState({ isPlaying: true })
    render(<PlaybackControls videoRef={makeVideoRef({ paused: false })} />)
    expect(screen.getByText(/⏸ Pause/)).toBeInTheDocument()
  })

  test('affiche les 3 boutons de vitesse (0.5x, 1x, 2x)', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    expect(screen.getByRole('button', { name: /vitesse 0\.5x/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vitesse 1x/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vitesse 2x/i })).toBeInTheDocument()
  })

  test('clic Play appelle video.play() quand en pause', () => {
    const ref = makeVideoRef({ paused: true })
    render(<PlaybackControls videoRef={ref} />)
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect((ref.current as { play: ReturnType<typeof vi.fn> }).play).toHaveBeenCalled()
  })

  test('clic Play met setIsPlaying(true)', () => {
    render(<PlaybackControls videoRef={makeVideoRef({ paused: true })} />)
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(useVideoStore.getState().isPlaying).toBe(true)
  })

  test('clic Pause appelle video.pause() quand en lecture', () => {
    useVideoStore.setState({ isPlaying: true })
    const ref = makeVideoRef({ paused: false })
    render(<PlaybackControls videoRef={ref} />)
    fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
    expect((ref.current as { pause: ReturnType<typeof vi.fn> }).pause).toHaveBeenCalled()
  })

  test('clic Pause met setIsPlaying(false)', () => {
    useVideoStore.setState({ isPlaying: true })
    render(<PlaybackControls videoRef={makeVideoRef({ paused: false })} />)
    fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
    expect(useVideoStore.getState().isPlaying).toBe(false)
  })

  test('togglePlay ne fait rien si videoRef.current est null', () => {
    const ref = createRef<HTMLVideoElement>()
    // ref.current est null
    expect(() => {
      render(<PlaybackControls videoRef={ref} />)
      fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    }).not.toThrow()
  })

  test('clic sur 2x met playbackRate à 2', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    fireEvent.click(screen.getByRole('button', { name: /vitesse 2x/i }))
    expect(useVideoStore.getState().playbackRate).toBe(2)
  })

  test('clic sur 0.5x met playbackRate à 0.5', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    fireEvent.click(screen.getByRole('button', { name: /vitesse 0\.5x/i }))
    expect(useVideoStore.getState().playbackRate).toBe(0.5)
  })

  test('clic vitesse met à jour video.playbackRate', () => {
    const ref = makeVideoRef()
    render(<PlaybackControls videoRef={ref} />)
    fireEvent.click(screen.getByRole('button', { name: /vitesse 2x/i }))
    expect((ref.current as HTMLVideoElement).playbackRate).toBe(2)
  })

  test('handleSpeed sans video (ref null) ne plante pas', () => {
    const ref = createRef<HTMLVideoElement>()
    expect(() => {
      render(<PlaybackControls videoRef={ref} />)
      fireEvent.click(screen.getByRole('button', { name: /vitesse 2x/i }))
    }).not.toThrow()
    expect(useVideoStore.getState().playbackRate).toBe(2)
  })

  test('le bouton vitesse active a la class btn-primary', () => {
    useVideoStore.setState({ playbackRate: 1 })
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    const btn1x = screen.getByRole('button', { name: /vitesse 1x/i })
    expect(btn1x.className).toContain('btn-primary')
  })

  test('les autres boutons vitesse ont btn-secondary', () => {
    useVideoStore.setState({ playbackRate: 1 })
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    const btn05 = screen.getByRole('button', { name: /vitesse 0\.5x/i })
    const btn2x = screen.getByRole('button', { name: /vitesse 2x/i })
    expect(btn05.className).toContain('btn-secondary')
    expect(btn2x.className).toContain('btn-secondary')
  })
})
