import { describe, test, expect, vi } from 'vitest'
import { render, fireEvent, screen } from '@testing-library/react'
import { VideoTimeline } from './VideoTimeline'

const defaultProps = {
  currentFrame: 0,
  totalFrames: 1000,
  fps: 25,
  annotations: [],
  onSeek: vi.fn(),
}

describe('VideoTimeline', () => {
  test('renders a canvas element', () => {
    render(<VideoTimeline {...defaultProps} />)
    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  test('canvas has width and height attributes', () => {
    render(<VideoTimeline {...defaultProps} />)
    const canvas = document.querySelector('canvas')!
    expect(canvas.getAttribute('width')).toBeTruthy()
    expect(canvas.getAttribute('height')).toBeTruthy()
  })

  test('calls onSeek when clicking the timeline', () => {
    const onSeek = vi.fn()
    const { container } = render(<VideoTimeline {...defaultProps} onSeek={onSeek} />)
    const canvas = container.querySelector('canvas')!
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 50, width: 800, height: 50,
      toJSON: () => {},
    })
    fireEvent.mouseDown(canvas, { clientX: 100 })
    expect(onSeek).toHaveBeenCalled()
  })

  test('onSeek receives a frame number >= 0', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <VideoTimeline {...defaultProps} onSeek={onSeek} totalFrames={1000} />
    )
    const canvas = container.querySelector('canvas')!
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 50, width: 800, height: 50,
      toJSON: () => {},
    })
    fireEvent.mouseDown(canvas, { clientX: 50 })
    const calledWith = onSeek.mock.calls[0][0]
    expect(calledWith).toBeGreaterThanOrEqual(0)
  })

  test('onSeek receives a frame number <= totalFrames', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <VideoTimeline {...defaultProps} onSeek={onSeek} totalFrames={1000} />
    )
    const canvas = container.querySelector('canvas')!
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 50, width: 800, height: 50,
      toJSON: () => {},
    })
    fireEvent.mouseDown(canvas, { clientX: 50 })
    const calledWith = onSeek.mock.calls[0][0]
    expect(calledWith).toBeLessThanOrEqual(1000)
  })

  test('canvas has cursor pointer style', () => {
    const { container } = render(<VideoTimeline {...defaultProps} />)
    const canvas = container.querySelector('canvas')!
    expect(canvas.style.cursor).toBe('pointer')
  })

  test('re-renders without error when currentFrame changes', () => {
    const { rerender } = render(<VideoTimeline {...defaultProps} currentFrame={0} />)
    expect(() =>
      rerender(<VideoTimeline {...defaultProps} currentFrame={100} />)
    ).not.toThrow()
  })

  test('re-renders without error when annotations change', () => {
    const { rerender } = render(<VideoTimeline {...defaultProps} annotations={[]} />)
    expect(() =>
      rerender(
        <VideoTimeline
          {...defaultProps}
          annotations={[{ frame_number: 100, label: 'beat', timestamp_ms: 4000 }]}
        />
      )
    ).not.toThrow()
  })

  test('shows visual zoom buttons', () => {
    render(<VideoTimeline {...defaultProps} />)
    expect(screen.getByRole('button', { name: /zoom avant timeline/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zoom arrière timeline/i })).toBeInTheDocument()
  })

  test('zoom in button shows reset control', () => {
    render(<VideoTimeline {...defaultProps} currentFrame={200} />)
    fireEvent.click(screen.getByRole('button', { name: /zoom avant timeline/i }))
    expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument()
  })

  test('keeps the current frame visible after zooming and moving near the right edge', () => {
    const { rerender } = render(<VideoTimeline {...defaultProps} currentFrame={100} totalFrames={1000} />)
    fireEvent.click(screen.getByRole('button', { name: /zoom avant timeline/i }))
    rerender(<VideoTimeline {...defaultProps} currentFrame={920} totalFrames={1000} />)
    expect(screen.getByRole('button', { name: /reset zoom/i })).toBeInTheDocument()
  })

  test('clicking an annotation marker selects it', () => {
    const onSelectAnnotation = vi.fn()
    const annotation = { id: 'a1', frame_number: 100, label: 'beat', timestamp_ms: 4000 }
    const { container } = render(
      <VideoTimeline
        {...defaultProps}
        annotations={[annotation as any]}
        onSelectAnnotation={onSelectAnnotation}
      />
    )
    const canvas = container.querySelector('canvas')!
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, top: 0, left: 0, right: 800, bottom: 50, width: 800, height: 50,
      toJSON: () => {},
    })
    fireEvent.mouseDown(canvas, { clientX: 80 })
    expect(onSelectAnnotation).toHaveBeenCalledWith('a1')
  })
})
