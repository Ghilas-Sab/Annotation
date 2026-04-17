import { describe, test, expect, vi, beforeEach } from 'vitest'
import { renderHook, fireEvent } from '@testing-library/react'
import { useVideoKeyboard } from './useVideoKeyboard'
import { useAnnotationStore } from '../stores/annotationStore'

const defaultOpts = {
  currentFrame: 10,
  totalFrames: 1000,
  fps: 25,
  annotations: [],
}

beforeEach(() => {
  useAnnotationStore.getState().setAnnotations([])
  vi.clearAllMocks()
})

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

  test('Ctrl+ArrowRight uses interval between the two annotations just before current frame', () => {
    const seek = vi.fn()
    const annotations = [
      { id: '1', frame_number: 0 } as any,
      { id: '2', frame_number: 5 } as any,
      { id: '3', frame_number: 8 } as any
    ]
    // currentFrame=10 : les deux avant = [5, 8], step = 3 → 10 + 3 = 13
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 10, annotations, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    expect(seek).toHaveBeenCalledWith(13)
  })

  test('Ctrl+ArrowRight falls back to 10 when fewer than 2 annotations are before current frame', () => {
    const seek = vi.fn()
    const annotations = [
      { id: '1', frame_number: 100 } as any,
      { id: '2', frame_number: 150 } as any
    ]
    // currentFrame=10 est avant toutes les annotations → fallback 10
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 10, annotations, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    expect(seek).toHaveBeenCalledWith(20) // 10 + fallback(10)
  })

  test('Space creates annotation at current frame', () => {
    const createAnnotation = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, seek: vi.fn(), createAnnotation }))
    fireEvent.keyDown(window, { key: ' ' })
    expect(createAnnotation).toHaveBeenCalledWith(10)
  })

  test('Alt+ArrowLeft seeks to frame 0', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 150, totalFrames: 500, seek }))
    fireEvent.keyDown(window, { key: 'ArrowLeft', altKey: true })
    expect(seek).toHaveBeenCalledWith(0)
  })

  test('Alt+ArrowRight seeks to last frame (totalFrames)', () => {
    const seek = vi.fn()
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 150, totalFrames: 500, seek }))
    fireEvent.keyDown(window, { key: 'ArrowRight', altKey: true })
    expect(seek).toHaveBeenCalledWith(500)
  })

  test('Alt+ArrowLeft calls preventDefault to avoid browser navigation', () => {
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 150, totalFrames: 500, seek: vi.fn() }))
    const event = new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)
    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  test('Ctrl+ArrowRight uses live store annotations, not stale closure', () => {
    const seek = vi.fn()
    const { rerender } = renderHook(({ ann }) => useVideoKeyboard({ ...defaultOpts, currentFrame: 50, totalFrames: 500, annotations: ann, seek }), {
      initialProps: { ann: [] }
    })
    
    // Simuler le changement d'annotations (comme si le parent rerenderait avec de nouvelles datas)
    rerender({ ann: [
      { id: '1', frame_number: 20 } as any, 
      { id: '2', frame_number: 35 } as any
    ]})
    
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    
    // step = 35 - 20 = 15. currentFrame(50) + 15 = 65.
    expect(seek).toHaveBeenCalledWith(65)
  })

  test('Ctrl+ArrowRight from an annotation uses interval between it and previous', () => {
    const seek = vi.fn()
    const annotations = [
      { id: '1', frame_number: 10 } as any, 
      { id: '2', frame_number: 25 } as any // interval = 15
    ]
    
    renderHook(() => useVideoKeyboard({ ...defaultOpts, currentFrame: 25, annotations, seek }))
    
    fireEvent.keyDown(window, { key: 'ArrowRight', ctrlKey: true })
    
    // On est à 25, l'intervalle précédent est 15, on doit sauter à 40
    expect(seek).toHaveBeenCalledWith(40)
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
