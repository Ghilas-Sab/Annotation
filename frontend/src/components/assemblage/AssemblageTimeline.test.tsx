import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AssemblageTimeline from './AssemblageTimeline'
import type { AssemblageClip, AudioTrack } from '../../stores/assemblageStore'
import type { Annotation, Category } from '../../types/annotation'

vi.mock('wavesurfer.js', () => ({
  default: {
    create: vi.fn(() => ({
      load: vi.fn(),
      loadBlob: vi.fn(),
      on: vi.fn(),
      destroy: vi.fn(),
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      seekTo: vi.fn(),
      setVolume: vi.fn(),
    })),
  },
}))

vi.mock('../../utils/audioPersistence', () => ({
  saveAudioTrackBlob: vi.fn().mockResolvedValue(true),
  loadAudioTrackBlobUrl: vi.fn().mockResolvedValue(null),
  deleteAudioTrackBlob: vi.fn().mockResolvedValue(undefined),
}))

const buildClip = (overrides: Partial<AssemblageClip> = {}): AssemblageClip => ({
  id: 'clip-1',
  videoId: 'v1',
  projectId: 'p1',
  name: 'clip1.mp4',
  duration: 10,
  ...overrides,
})

const buildAudioTrack = (overrides: Partial<AudioTrack> = {}): AudioTrack => ({
  id: 'audio-1',
  name: 'music.mp3',
  url: 'blob:music',
  duration: 10,
  trimStart: 0,
  trimEnd: 10,
  startOffset: 0,
  ...overrides,
})

const buildAnnotation = (overrides: Partial<Annotation> = {}): Annotation => ({
  id: 'a1',
  video_id: 'v1',
  frame_number: 50,
  timestamp_ms: 2000,
  label: 'Beat 1',
  created_at: '',
  updated_at: '',
  ...overrides,
})

const buildCategory = (overrides: Partial<Category> = {}): Category => ({
  id: 'c1',
  video_id: 'v1',
  name: 'Kick',
  color: '#FF0000',
  created_at: '',
  ...overrides,
})

const renderTimeline = (
  clips: AssemblageClip[] = [],
  annotations: Record<string, Annotation[]> = {},
  extraProps: Partial<React.ComponentProps<typeof AssemblageTimeline>> = {},
) =>
  render(
    <AssemblageTimeline
      clips={clips}
      onRemoveClip={() => {}}
      onReorderClips={() => {}}
      annotations={annotations}
      {...extraProps}
    />
  )

describe('S7.8 — Calage annotations sur timeline', () => {
  test('annotation markers are rendered on clip block', () => {
    const annotations = {
      v1: [
        buildAnnotation({ id: 'a1', timestamp_ms: 2000, label: 'Beat 1' }),
        buildAnnotation({ id: 'a2', timestamp_ms: 7000, label: 'Beat 2' }),
      ],
    }
    renderTimeline([buildClip({ videoId: 'v1', duration: 10 })], annotations)
    expect(screen.getByTestId('annotation-marker-a1')).toBeInTheDocument()
    expect(screen.getByTestId('annotation-marker-a2')).toBeInTheDocument()
  })

  test('marker position is proportional to timestamp', () => {
    const annotations = { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 5000 })] }
    renderTimeline([buildClip({ videoId: 'v1', duration: 10 })], annotations)
    const marker = screen.getByTestId('annotation-marker-a1')
    const leftPct = parseFloat(marker.style.left)
    expect(leftPct).toBeCloseTo(50, 1)
  })

  test('adapted clip markers use timestamps projected to the adapted BPM timeline', () => {
    const annotations = {
      v1: [
        buildAnnotation({ id: 'a1', timestamp_ms: 1000 }),
        buildAnnotation({ id: 'a2', timestamp_ms: 3000 }),
        buildAnnotation({ id: 'a3', timestamp_ms: 7000 }),
      ],
    }

    renderTimeline([buildClip({ videoId: 'v1', sourceType: 'adapted', bpm: 120, duration: 2 })], annotations)

    expect(parseFloat(screen.getByTestId('annotation-marker-a1').style.left)).toBeCloseTo(12.5, 1)
    expect(parseFloat(screen.getByTestId('annotation-marker-a2').style.left)).toBeCloseTo(37.5, 1)
    expect(parseFloat(screen.getByTestId('annotation-marker-a3').style.left)).toBeCloseTo(62.5, 1)
  })

  test('adapted clip tooltip shows the projected adapted timestamp', () => {
    const annotations = {
      v1: [
        buildAnnotation({ id: 'a1', label: 'Beat adapté', timestamp_ms: 1000 }),
        buildAnnotation({ id: 'a2', timestamp_ms: 3000 }),
      ],
    }

    renderTimeline([buildClip({ videoId: 'v1', sourceType: 'adapted', bpm: 120, duration: 2 })], annotations)
    fireEvent.mouseEnter(screen.getByTestId('annotation-marker-a1'))

    expect(screen.getByText('Beat adapté')).toBeInTheDocument()
    expect(screen.getByText(/00:00\.06/)).toBeInTheDocument()
  })

  test('hovering marker shows tooltip with label and timestamp', () => {
    const annotations = {
      v1: [buildAnnotation({ id: 'a1', label: 'Beat 1', timestamp_ms: 3000 })],
    }
    renderTimeline([buildClip({ videoId: 'v1', duration: 10 })], annotations)
    fireEvent.mouseEnter(screen.getByTestId('annotation-marker-a1'))
    expect(screen.getByText('Beat 1')).toBeInTheDocument()
    expect(screen.getByText(/00:03/)).toBeInTheDocument()
  })

  test('tooltip disappears when marker is unhovered', () => {
    const annotations = {
      v1: [buildAnnotation({ id: 'a1', label: 'Beat 1', timestamp_ms: 3000 })],
    }
    renderTimeline([buildClip({ videoId: 'v1', duration: 10 })], annotations)
    const marker = screen.getByTestId('annotation-marker-a1')
    fireEvent.mouseEnter(marker)
    expect(screen.getByText('Beat 1')).toBeInTheDocument()
    fireEvent.mouseLeave(marker)
    expect(screen.queryByText('Beat 1')).not.toBeInTheDocument()
  })

  test('marker uses category color when annotation has category', () => {
    const annotations = {
      v1: [buildAnnotation({ id: 'a1', category: buildCategory({ color: '#FF0000' }) })],
    }
    renderTimeline([buildClip({ videoId: 'v1', duration: 5 })], annotations)
    const marker = screen.getByTestId('annotation-marker-a1')
    expect(marker).toHaveStyle({ backgroundColor: '#FF0000' })
  })

  test('default color is semi-transparent white when no category', () => {
    const annotations = { v1: [buildAnnotation({ id: 'a1', category: undefined })] }
    renderTimeline([buildClip({ videoId: 'v1', duration: 10 })], annotations)
    const marker = screen.getByTestId('annotation-marker-a1')
    expect(marker).toHaveStyle({ backgroundColor: 'rgba(255,255,255,0.6)' })
  })
})

describe('Synchronisation BPM musique', () => {
  test('does not render a manual music BPM input', () => {
    renderTimeline(
      [buildClip({ id: 'c1', bpm: 120 })],
      { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 1000 })] },
      { audioTracks: [buildAudioTrack()] },
    )

    expect(screen.queryByRole('spinbutton', { name: /bpm musique/i })).not.toBeInTheDocument()
  })

  test('sync button is disabled when no video BPM is available', () => {
    renderTimeline(
      [buildClip({ id: 'c1', bpm: undefined })],
      { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 1000 })] },
      { audioTracks: [buildAudioTrack()] },
    )

    expect(screen.getByRole('button', { name: /synchroniser/i })).toBeDisabled()
  })

  test('clicking synchronize uses the video BPM to shift the music onto the video annotation', () => {
    const onVideoOffsetChange = vi.fn()
    const onAudioOffsetChange = vi.fn()
    renderTimeline(
      [buildClip({ id: 'c1', videoId: 'v1', bpm: 120, duration: 10, startOffset: 0.2 })],
      { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 1000 })] },
      { audioTracks: [buildAudioTrack()], onVideoOffsetChange, onAudioOffsetChange },
    )

    fireEvent.click(screen.getByRole('button', { name: /synchroniser/i }))

    expect(onVideoOffsetChange).not.toHaveBeenCalled()
    expect(onAudioOffsetChange).toHaveBeenCalledWith('audio-1', 0.2)
  })

  test('synchronized beats are rendered in the music lane under video annotations', () => {
    renderTimeline(
      [buildClip({ id: 'c1', videoId: 'v1', bpm: 120, duration: 10, startOffset: 0.2 })],
      { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 1000 })] },
      { audioTracks: [buildAudioTrack()], onAudioOffsetChange: vi.fn() },
    )

    fireEvent.click(screen.getByRole('button', { name: /synchroniser/i }))

    expect(screen.getByTestId('audio-beat-marker-a1')).toBeInTheDocument()
    expect(parseFloat(screen.getByTestId('audio-beat-marker-a1').style.left)).toBeCloseTo((1.2 / 10.2) * 100, 1)
  })

  test('synchronization accounts for audio trim so the beat marker has no trim offset drift', () => {
    const onAudioOffsetChange = vi.fn()
    renderTimeline(
      [buildClip({ id: 'c1', videoId: 'v1', bpm: 120, duration: 10 })],
      { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 1000 })] },
      { audioTracks: [buildAudioTrack({ trimStart: 0.25, trimEnd: 10 })], onAudioOffsetChange },
    )

    fireEvent.click(screen.getByRole('button', { name: /synchroniser/i }))

    expect(onAudioOffsetChange).toHaveBeenCalledWith('audio-1', 0.25)
    expect(parseFloat(screen.getByTestId('audio-beat-marker-a1').style.left)).toBeCloseTo(10, 1)
  })

  test('adapted clip synchronization uses projected annotation timestamps', () => {
    const onAudioOffsetChange = vi.fn()
    renderTimeline(
      [buildClip({ id: 'c1', videoId: 'v1', sourceType: 'adapted', bpm: 120, duration: 2 })],
      {
        v1: [
          buildAnnotation({ id: 'a1', timestamp_ms: 1000 }),
          buildAnnotation({ id: 'a2', timestamp_ms: 3000 }),
        ],
      },
      { audioTracks: [buildAudioTrack({ duration: 2, trimEnd: 2 })], onAudioOffsetChange },
    )

    fireEvent.click(screen.getByRole('button', { name: /synchroniser/i }))

    expect(onAudioOffsetChange).toHaveBeenCalledWith('audio-1', 0.25)
    expect(parseFloat(screen.getByTestId('audio-beat-marker-a1').style.left)).toBeCloseTo(12.5, 1)
    expect(parseFloat(screen.getByTestId('audio-beat-marker-a2').style.left)).toBeCloseTo(37.5, 1)
  })
})

describe('Video clip placement and trimming', () => {
  test('renders clip at its timeline offset', () => {
    renderTimeline([buildClip({ id: 'c1', startOffset: 20, duration: 10 })])

    const clip = screen.getByTestId('video-clip-c1')
    expect(parseFloat(clip.style.left)).toBeCloseTo(66.67, 1)
    expect(parseFloat(clip.style.width)).toBeCloseTo(33.33, 1)
  })

  test('renders trim handles on video clips', () => {
    renderTimeline([buildClip({ id: 'c1', duration: 10 })])

    expect(screen.getByTestId('video-trim-start-handle')).toBeInTheDocument()
    expect(screen.getByTestId('video-trim-end-handle')).toBeInTheDocument()
  })

  test('annotation marker position respects video trim', () => {
    const annotations = { v1: [buildAnnotation({ id: 'a1', timestamp_ms: 5000 })] }
    renderTimeline([buildClip({ id: 'c1', duration: 10, trimStart: 2, trimEnd: 7 })], annotations)

    const marker = screen.getByTestId('annotation-marker-a1')
    expect(parseFloat(marker.style.left)).toBeCloseTo(60, 1)
  })

  test('dragging a video clip calls offset change', () => {
    const onVideoOffsetChange = vi.fn()
    renderTimeline([buildClip({ id: 'c1', duration: 10 })], {}, { onVideoOffsetChange })
    const lane = screen.getByTestId('assemblage-timeline')
    vi.spyOn(lane, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 58,
      top: 0,
      left: 0,
      right: 100,
      bottom: 58,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(screen.getByTestId('video-clip-c1'), { clientX: 0 })
    fireEvent.mouseMove(window, { clientX: 20 })
    fireEvent.mouseUp(window)

    expect(onVideoOffsetChange).toHaveBeenCalledWith('c1', 2)
  })

  test('clicking the timeline background seeks to that time', () => {
    const onPlayFromTime = vi.fn()
    renderTimeline([buildClip({ id: 'c1', duration: 10 })], {}, { onPlayFromTime })
    const lane = screen.getByTestId('assemblage-timeline')
    vi.spyOn(lane, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 58,
      top: 0,
      left: 0,
      right: 100,
      bottom: 58,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(lane, { clientX: 25 })
    fireEvent.mouseUp(window)

    expect(onPlayFromTime).toHaveBeenCalledWith(2.5)
  })

  test('dragging on the timeline background scrubs the playhead', () => {
    const onPlayFromTime = vi.fn()
    renderTimeline([buildClip({ id: 'c1', duration: 10 })], {}, { onPlayFromTime })
    const lane = screen.getByTestId('assemblage-timeline')
    vi.spyOn(lane, 'getBoundingClientRect').mockReturnValue({
      width: 100,
      height: 58,
      top: 0,
      left: 0,
      right: 100,
      bottom: 58,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    fireEvent.mouseDown(lane, { clientX: 10 })
    fireEvent.mouseMove(window, { clientX: 80 })
    fireEvent.mouseUp(window)

    expect(onPlayFromTime).toHaveBeenNthCalledWith(1, 1)
    expect(onPlayFromTime).toHaveBeenLastCalledWith(8)
  })

  test('dragging the reorder handle can move the first clip after the last clip', () => {
    const onReorderClips = vi.fn()
    const clips = [
      buildClip({ id: 'c1', videoId: 'v1', name: 'clip1.mp4', duration: 10 }),
      buildClip({ id: 'c2', videoId: 'v2', name: 'clip2.mp4', duration: 8 }),
      buildClip({ id: 'c3', videoId: 'v3', name: 'clip3.mp4', duration: 6 }),
    ]
    renderTimeline(clips, {}, { onReorderClips })

    const dataTransfer = {
      effectAllowed: '',
      setData: vi.fn(),
      getData: vi.fn(() => 'c1'),
    }

    fireEvent.dragStart(screen.getByTestId('video-reorder-handle-c1'), { dataTransfer })
    fireEvent.dragEnter(screen.getByTestId('video-clip-c3'))
    fireEvent.drop(screen.getByTestId('video-clip-c3'), { dataTransfer })

    expect(onReorderClips).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'c2' }),
      expect.objectContaining({ id: 'c3' }),
      expect.objectContaining({ id: 'c1' }),
    ])
  })
})
