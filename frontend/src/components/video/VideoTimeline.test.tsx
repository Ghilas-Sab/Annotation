import { describe, test, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
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
    fireEvent.click(canvas, { clientX: 100 })
    expect(onSeek).toHaveBeenCalled()
  })

  test('onSeek receives a frame number >= 0', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <VideoTimeline {...defaultProps} onSeek={onSeek} totalFrames={1000} />
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.click(canvas, { clientX: 50 })
    const calledWith = onSeek.mock.calls[0][0]
    expect(calledWith).toBeGreaterThanOrEqual(0)
  })

  test('onSeek receives a frame number <= totalFrames', () => {
    const onSeek = vi.fn()
    const { container } = render(
      <VideoTimeline {...defaultProps} onSeek={onSeek} totalFrames={1000} />
    )
    const canvas = container.querySelector('canvas')!
    fireEvent.click(canvas, { clientX: 50 })
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
})
