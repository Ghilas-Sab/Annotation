import { describe, test, expect, vi } from 'vitest'
import { renderHook, fireEvent } from '@testing-library/react'
import { useVideoKeyboard } from './useVideoKeyboard'

const defaultOpts = {
  currentFrame: 10,
  totalFrames: 1000,
  fps: 25,
  annotations: [],
}

describe('useVideoKeyboard', () => {
  test('ArrowRight seeks to next frame', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(seek).toHaveBeenCalledWith(11)
  })

  test('ArrowLeft seeks to previous frame', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenCalledWith(9)
  })

  test('Shift+ArrowRight seeks +5 frames', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', shiftKey: true })
    expect(seek).toHaveBeenCalledWith(15)
  })

  test('Shift+ArrowLeft seeks -5 frames', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft', shiftKey: true })
    expect(seek).toHaveBeenCalledWith(5)
  })

  test('Ctrl+ArrowRight seeks forward by inter-annotation step (fallback 10)', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    expect(seek).toHaveBeenCalledWith(20)
  })

  test('Ctrl+ArrowLeft seeks backward by inter-annotation step (fallback 10)', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft', ctrlKey: true })
    expect(seek).toHaveBeenCalledWith(0)
  })

  test('Ctrl+ArrowRight uses computed inter-annotation step', () => {
    const seek = vi.fn()
    const annotations = [
      { frame_number: 0 }, { frame_number: 5 }, { frame_number: 8 }
    ]
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 10, annotations, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    // last two left: 5 and 8, step = 8 - 5 = 3 → 10 + 3 = 13
    expect(seek).toHaveBeenCalledWith(13)
  })

  test('Space creates annotation at current frame', () => {
    const createAnnotation = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek: vi.fn(), createAnnotation }))
    fireEvent.keyDown(window, { key: ' ' })
    expect(createAnnotation).toHaveBeenCalledWith(10)
  })

  test('does not go below frame 0', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 0, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(seek).toHaveBeenCalledWith(0)
  })

  test('does not go above totalFrames', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 1000, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(seek).toHaveBeenCalledWith(1000)
  })

  test('ignores keys when focus is in an input', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    const input = document.createElement('input')
    document.body.appendChild(input)
    fireEvent.keyDown(input, { key: 'ArrowRight' })
    expect(seek).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  test('ignores keys when focus is in a textarea', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    fireEvent.keyDown(textarea, { key: 'ArrowRight' })
    expect(seek).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  test('ignores keys when focus is in a select', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek }))
    const select = document.createElement('select')
    document.body.appendChild(select)
    fireEvent.keyDown(select, { key: 'ArrowRight' })
    expect(seek).not.toHaveBeenCalled()
    document.body.removeChild(select)
  })
})
