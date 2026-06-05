import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

import type { VideoPlayerHandle } from './VideoPlayer'

const makeVideoRef = (overrides: Partial<VideoPlayerHandle> = {}) => {
  const handle: VideoPlayerHandle = {
    seekToFrame: vi.fn(),
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    setPlaybackRate: vi.fn(),
    isPaused: vi.fn().mockReturnValue(true),
    ...overrides,
  }
  const ref = createRef<VideoPlayerHandle>()
  Object.defineProperty(ref, 'current', { value: handle, writable: true })
  return ref
}

describe('PlaybackControls', () => {
  test('affiche le bouton Play quand non en lecture', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })

  test('affiche le bouton play (icône) quand isPlaying = false', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    expect(screen.getByRole('button', { name: /^play$/i })).toBeInTheDocument()
  })

  test('affiche le bouton pause (icône) quand isPlaying = true', () => {
    useVideoStore.setState({ isPlaying: true })
    render(<PlaybackControls videoRef={makeVideoRef({ paused: false })} />)
    expect(screen.getByRole('button', { name: /^pause$/i })).toBeInTheDocument()
  })

  test('affiche les 3 boutons de vitesse (0.5x, 1x, 2x)', () => {
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    expect(screen.getByRole('button', { name: /vitesse 0\.5x/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vitesse 1x/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /vitesse 2x/i })).toBeInTheDocument()
  })

  test('clic Play appelle handle.play() quand en pause', () => {
    const ref = makeVideoRef({ isPaused: vi.fn().mockReturnValue(true) })
    render(<PlaybackControls videoRef={ref} />)
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(ref.current!.play).toHaveBeenCalled()
  })

  test('clic Play met setIsPlaying(true)', () => {
    render(<PlaybackControls videoRef={makeVideoRef({ isPaused: vi.fn().mockReturnValue(true) })} />)
    fireEvent.click(screen.getByRole('button', { name: /^play$/i }))
    expect(useVideoStore.getState().isPlaying).toBe(true)
  })

  test('clic Pause appelle handle.pause() quand en lecture', () => {
    useVideoStore.setState({ isPlaying: true })
    const ref = makeVideoRef({ isPaused: vi.fn().mockReturnValue(false) })
    render(<PlaybackControls videoRef={ref} />)
    fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
    expect(ref.current!.pause).toHaveBeenCalled()
  })

  test('clic Pause met setIsPlaying(false)', () => {
    useVideoStore.setState({ isPlaying: true })
    render(<PlaybackControls videoRef={makeVideoRef({ isPaused: vi.fn().mockReturnValue(false) })} />)
    fireEvent.click(screen.getByRole('button', { name: /^pause$/i }))
    expect(useVideoStore.getState().isPlaying).toBe(false)
  })

  test('togglePlay ne fait rien si videoRef.current est null', () => {
    const ref = createRef<VideoPlayerHandle>()
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

  test('clic vitesse appelle handle.setPlaybackRate(2)', () => {
    const ref = makeVideoRef()
    render(<PlaybackControls videoRef={ref} />)
    fireEvent.click(screen.getByRole('button', { name: /vitesse 2x/i }))
    expect(ref.current!.setPlaybackRate).toHaveBeenCalledWith(2)
  })

  test('handleSpeed sans video (ref null) ne plante pas', () => {
    const ref = createRef<VideoPlayerHandle>()
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
    expect(btn1x).toHaveStyle({ background: 'var(--ac-muted)', color: 'var(--ac)' })
  })

  test('les autres boutons vitesse sont neutres', () => {
    useVideoStore.setState({ playbackRate: 1 })
    render(<PlaybackControls videoRef={makeVideoRef()} />)
    const btn05 = screen.getByRole('button', { name: /vitesse 0\.5x/i })
    const btn2x = screen.getByRole('button', { name: /vitesse 2x/i })
    expect(btn05).toHaveStyle({ background: 'transparent', color: 'var(--text-2)' })
    expect(btn2x).toHaveStyle({ background: 'transparent', color: 'var(--text-2)' })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Tests S6.4 — Boutons de navigation (panneau contrôles tablette)
// ─────────────────────────────────────────────────────────────────────────────
describe('PlaybackControls — navigation buttons (S6.4)', () => {
  const defaultNavProps = {
    videoRef: createRef<HTMLVideoElement>(),
    currentFrame: 10,
    totalFrames: 500,
    fps: 25,
  }

  test('clicking next-frame button calls onSeek with current+1', async () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} onSeek={seekFn} />)
    await userEvent.click(screen.getByRole('button', { name: /frame suivante/i }))
    expect(seekFn).toHaveBeenCalledWith(11)
  })

  test('clicking prev-frame button calls onSeek with current-1', async () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} onSeek={seekFn} />)
    await userEvent.click(screen.getByRole('button', { name: /frame précédente/i }))
    expect(seekFn).toHaveBeenCalledWith(9)
  })

  test('clicking +5 frames button calls onSeek with current+5', async () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} onSeek={seekFn} />)
    await userEvent.click(screen.getByRole('button', { name: /\+5 frames/i }))
    expect(seekFn).toHaveBeenCalledWith(15)
  })

  test('clicking -5 frames button calls onSeek with current-5', async () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} onSeek={seekFn} />)
    await userEvent.click(screen.getByRole('button', { name: /-5 frames/i }))
    expect(seekFn).toHaveBeenCalledWith(5)
  })

  test('clicking go-to-start button calls onSeek with 0', async () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} currentFrame={100} onSeek={seekFn} />)
    await userEvent.click(screen.getByRole('button', { name: /début vidéo/i }))
    expect(seekFn).toHaveBeenCalledWith(0)
  })

  test('clicking go-to-end button calls onSeek with totalFrames-1', async () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} currentFrame={100} onSeek={seekFn} />)
    await userEvent.click(screen.getByRole('button', { name: /fin vidéo/i }))
    expect(seekFn).toHaveBeenCalledWith(499)
  })

  test('clicking annotate button calls onAnnotate with currentFrame', async () => {
    const annotateFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} currentFrame={42} onAnnotate={annotateFn} />)
    await userEvent.click(screen.getByRole('button', { name: /annoter/i }))
    expect(annotateFn).toHaveBeenCalledWith(42)
  })

  test('le bouton raccourcis n’est pas rendu dans la barre de lecture compacte', async () => {
    render(<PlaybackControls {...defaultNavProps} onSeek={vi.fn()} />)
    expect(screen.queryByRole('button', { name: /raccourcis/i })).not.toBeInTheDocument()
  })

  test('keyboard shortcuts still work after adding buttons (ArrowRight)', () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} onSeek={seekFn} />)
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(seekFn).toHaveBeenCalledWith(11)
  })

  test('keyboard shortcuts still work after adding buttons (Space → annotate)', () => {
    const annotateFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} currentFrame={42} onAnnotate={annotateFn} />)
    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    expect(annotateFn).toHaveBeenCalledWith(42)
  })

  test('P toggles play/pause instead of annotating', () => {
    const annotateFn = vi.fn()
    const ref = makeVideoRef({ isPaused: vi.fn().mockReturnValue(true) })
    render(<PlaybackControls {...defaultNavProps} videoRef={ref} currentFrame={42} onAnnotate={annotateFn} />)
    fireEvent.keyDown(window, { key: 'p' })
    expect(ref.current!.play).toHaveBeenCalled()
    expect(annotateFn).not.toHaveBeenCalled()
  })

  test('all compact control buttons are rendered', () => {
    render(<PlaybackControls {...defaultNavProps} onSeek={vi.fn()} onAnnotate={vi.fn()} />)
    expect(screen.getByRole('button', { name: /frame précédente/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /frame suivante/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /-5 frames/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+5 frames/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saut intelligent précédent/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /saut intelligent suivant/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /début vidéo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /fin vidéo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /annoter/i })).toBeInTheDocument()
  })

  test('début vidéo button is rendered', () => {
    render(<PlaybackControls {...defaultNavProps} />)
    expect(screen.getByRole('button', { name: /début vidéo/i })).toBeInTheDocument()
  })

  test('fin vidéo button is rendered', () => {
    render(<PlaybackControls {...defaultNavProps} />)
    expect(screen.getByRole('button', { name: /fin vidéo/i })).toBeInTheDocument()
  })

  test('saut intelligent précédent button uses smart jump style', () => {
    render(<PlaybackControls {...defaultNavProps} />)
    expect(screen.getByRole('button', { name: /saut intelligent précédent/i }).className).toContain('playback-smart-jump-btn')
  })

  test('saut intelligent suivant button uses smart jump style', () => {
    render(<PlaybackControls {...defaultNavProps} />)
    expect(screen.getByRole('button', { name: /saut intelligent suivant/i }).className).toContain('playback-smart-jump-btn')
  })

  test('button order matches compact transport design', () => {
    render(<PlaybackControls {...defaultNavProps} />)
    const labels = screen.getAllByRole('button').map((button) => button.getAttribute('aria-label'))
    expect(labels.indexOf('saut intelligent précédent')).toBeLessThan(labels.indexOf('play'))
    expect(labels.indexOf('play')).toBeLessThan(labels.indexOf('saut intelligent suivant'))
    expect(labels.indexOf('saut intelligent suivant')).toBeLessThan(labels.indexOf('frame suivante'))
    expect(labels.indexOf('fin vidéo')).toBeLessThan(labels.indexOf('annoter'))
  })

  test('prédire annotation suivante — 0 annotations : avance du pas fallback', () => {
    const seekFn = vi.fn()
    render(<PlaybackControls {...defaultNavProps} annotations={[]} onSeek={seekFn} />)
    fireEvent.click(screen.getByRole('button', { name: /saut intelligent suivant/i }))
    expect(seekFn).toHaveBeenCalledWith(20)
  })

  test('prédire annotation suivante — 1 annotation : avance du pas fallback', () => {
    const seekFn = vi.fn()
    const ann = [{ id: '1', frame_number: 50, label: 'a', timestamp_ms: 0, video_id: 'v', created_at: '' }]
    render(<PlaybackControls {...defaultNavProps} fps={25} totalFrames={500} annotations={ann} onSeek={seekFn} />)
    fireEvent.click(screen.getByRole('button', { name: /saut intelligent suivant/i }))
    expect(seekFn).toHaveBeenCalledWith(20)
  })

  test('prédire annotation suivante — avant deux annotations précédentes : avance du pas fallback', () => {
    const seekFn = vi.fn()
    const ann = [
      { id: '1', frame_number: 10, label: 'a', timestamp_ms: 0, video_id: 'v', created_at: '' },
      { id: '2', frame_number: 40, label: 'b', timestamp_ms: 0, video_id: 'v', created_at: '' },
    ]
    render(<PlaybackControls {...defaultNavProps} annotations={ann} onSeek={seekFn} />)
    fireEvent.click(screen.getByRole('button', { name: /saut intelligent suivant/i }))
    expect(seekFn).toHaveBeenCalledWith(20)
  })

  test('prédire annotation suivante — utilise le même pas que Ctrl+→', () => {
    const seekFn = vi.fn()
    const ann = [
      { id: '1', frame_number: 0, label: 'a', timestamp_ms: 0, video_id: 'v', created_at: '' },
      { id: '2', frame_number: 30, label: 'b', timestamp_ms: 0, video_id: 'v', created_at: '' },
      { id: '3', frame_number: 50, label: 'c', timestamp_ms: 0, video_id: 'v', created_at: '' },
    ]
    render(<PlaybackControls {...defaultNavProps} currentFrame={50} annotations={ann} onSeek={seekFn} />)
    fireEvent.click(screen.getByRole('button', { name: /saut intelligent suivant/i }))
    expect(seekFn).toHaveBeenCalledWith(70)
  })

  test('prédire annotation suivante — depuis position arbitraire : avance avec le pas local', () => {
    const seekFn = vi.fn()
    const ann = [
      { id: '1', frame_number: 0, label: 'a', timestamp_ms: 0, video_id: 'v', created_at: '' },
      { id: '2', frame_number: 15, label: 'b', timestamp_ms: 0, video_id: 'v', created_at: '' },
    ]
    render(<PlaybackControls {...defaultNavProps} currentFrame={100} annotations={ann} onSeek={seekFn} />)
    fireEvent.click(screen.getByRole('button', { name: /saut intelligent suivant/i }))
    expect(seekFn).toHaveBeenCalledWith(115)
  })
})
