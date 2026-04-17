import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { createRef } from 'react'
import VideoPlayer, { VideoPlayerHandle } from './VideoPlayer'
import { useVideoStore } from '../../stores/videoStore'
import { seekToFrame } from '../../hooks/useFrameSeek'

// Mock hooks lourds
vi.mock('../../hooks/useRequestVideoFrame', () => ({
  useRequestVideoFrame: vi.fn(),
}))
vi.mock('../../hooks/useFrameSeek', () => ({
  seekToFrame: vi.fn(),
}))

beforeEach(() => {
  useVideoStore.setState({
    currentFrame: 0,
    fps: 0,
    totalFrames: 0,
    duration: 0,
    playbackRate: 1,
    videoId: null,
    currentVideo: null,
    isPlaying: false,
  })
  vi.mocked(seekToFrame).mockReset()
})

const defaultProps = {
  videoId: 'v1',
  fps: 25,
  totalFrames: 1000,
  duration: 40,
}

describe('VideoPlayer', () => {
  test('rend l\'élément vidéo', () => {
    render(<VideoPlayer {...defaultProps} />)
    expect(document.querySelector('video')).toBeInTheDocument()
  })

  test("l'URL de src contient /stream", () => {
    render(<VideoPlayer {...defaultProps} />)
    const video = document.querySelector('video')!
    expect(video.src).toMatch(/videos\/v1\/stream/)
  })

  test('affiche le bouton play/pause', () => {
    render(<VideoPlayer {...defaultProps} />)
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
  })

  test('affiche le scrubber (range)', () => {
    render(<VideoPlayer {...defaultProps} />)
    expect(screen.getByRole('slider', { name: /position de lecture/i })).toBeInTheDocument()
  })

  test('affiche Frame 0 au départ', () => {
    render(<VideoPlayer {...defaultProps} />)
    expect(screen.getByText(/frame 0/i)).toBeInTheDocument()
  })

  test('affiche / totalFrames', () => {
    render(<VideoPlayer {...defaultProps} />)
    expect(screen.getByText(/\/ 1000/)).toBeInTheDocument()
  })

  test('appelle setVideoMetadata au montage', () => {
    render(<VideoPlayer {...defaultProps} />)
    const s = useVideoStore.getState()
    expect(s.fps).toBe(25)
    expect(s.totalFrames).toBe(1000)
    expect(s.videoId).toBe('v1')
  })

  test('le scrubber a max = totalFrames', () => {
    render(<VideoPlayer {...defaultProps} />)
    const slider = screen.getByRole('slider', { name: /position de lecture/i }) as HTMLInputElement
    expect(slider.max).toBe('1000')
  })

  test('affiche ⏸ quand playing = true (via onPlay)', () => {
    render(<VideoPlayer {...defaultProps} />)
    const video = document.querySelector('video')!
    fireEvent.play(video)
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })

  test('affiche ▶ quand playing = false (via onPause)', () => {
    render(<VideoPlayer {...defaultProps} />)
    const video = document.querySelector('video')!
    fireEvent.play(video)
    fireEvent.pause(video)
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument()
  })

  test('le clic sur play appelle video.play()', () => {
    render(<VideoPlayer {...defaultProps} />)
    const video = document.querySelector('video') as HTMLVideoElement
    video.play = vi.fn().mockResolvedValue(undefined)
    video.pause = vi.fn()
    fireEvent.click(screen.getByRole('button', { name: /play/i }))
    expect(video.play).toHaveBeenCalled()
  })

  test('seekToFrame appelé lors du scrub via handleScrub', () => {
    render(<VideoPlayer {...defaultProps} />)
    const slider = screen.getByRole('slider', { name: /position de lecture/i })
    fireEvent.change(slider, { target: { value: '250' } })
    expect(seekToFrame).toHaveBeenCalled()
  })

  test('le ref expose seekToFrame', () => {
    const ref = createRef<VideoPlayerHandle>()
    render(<VideoPlayer {...defaultProps} ref={ref} />)
    expect(typeof ref.current?.seekToFrame).toBe('function')
  })

  test("le displayName est 'VideoPlayer'", () => {
    expect(VideoPlayer.displayName).toBe('VideoPlayer')
  })

  test('controls est désactivé (pas de contrôles natifs)', () => {
    render(<VideoPlayer {...defaultProps} />)
    const video = document.querySelector('video') as HTMLVideoElement
    expect(video.controls).toBe(false)
  })

  test('preload = metadata', () => {
    render(<VideoPlayer {...defaultProps} />)
    const video = document.querySelector('video') as HTMLVideoElement
    expect(video.preload).toBe('metadata')
  })
})
