import React from 'react'
import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AssemblageTimeline from './AssemblageTimeline'

vi.mock('wavesurfer.js', () => ({
  default: { create: vi.fn(() => ({ load: vi.fn(), loadBlob: vi.fn(), on: vi.fn(), destroy: vi.fn(), play: vi.fn(() => Promise.resolve()), pause: vi.fn(), seekTo: vi.fn(), setVolume: vi.fn() })) }
}))
vi.mock('../../utils/audioPersistence', () => ({
  saveAudioTrackBlob: vi.fn(), loadAudioTrackBlobUrl: vi.fn().mockResolvedValue(null), deleteAudioTrackBlob: vi.fn(),
}))

const clip = { id: 'c1', videoId: 'v1', projectId: 'p1', name: 'test', duration: 10 }
const annotations = { v1: [{ id: 'a1', video_id: 'v1', frame_number: 50, timestamp_ms: 2000, label: 'Beat', created_at: '', updated_at: '' }] }

describe('fireEvent test', () => {
  test('renders and markers visible', () => {
    render(<AssemblageTimeline clips={[clip]} onRemoveClip={() => {}} onReorderClips={() => {}} annotations={annotations} />)
    expect(screen.getByTestId('annotation-marker-a1')).toBeInTheDocument()
  })
})
