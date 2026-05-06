import { describe, test, expect, beforeEach } from 'vitest'
import {
  getClipEffectiveDuration,
  getClipFadeDuration,
  getClipFadeInDuration,
  getClipFadeOutDuration,
  getClipFadeOpacity,
  getClipTimelineEnd,
  getClipTimelineStart,
  useAssemblageStore,
} from './assemblageStore'
import type { AssemblageClip, AudioTrack } from './assemblageStore'

const buildClip = (overrides: Partial<AssemblageClip> = {}): AssemblageClip => ({
  id: `clip-${Math.random().toString(36).slice(2, 8)}`,
  videoId: 'v1',
  projectId: 'p1',
  name: 'clip.mp4',
  duration: 10,
  ...overrides,
})

const buildAudioTrack = (overrides: Partial<AudioTrack> = {}): AudioTrack => ({
  id: `audio-${Math.random().toString(36).slice(2, 8)}`,
  name: 'track.mp3',
  url: 'blob:test',
  duration: 30,
  trimStart: 0,
  trimEnd: 0,
  startOffset: 0,
  ...overrides,
})

beforeEach(() => {
  useAssemblageStore.setState({
    clips: [],
    audioTracks: [],
    annotations: {},
    activeProjectId: null,
    savedProjects: {},
  })
})

describe('switchProject', () => {
  test('is a no-op when switching to the already active project', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addClips([buildClip({ name: 'clip-p1.mp4', projectId: 'p1' })])
    useAssemblageStore.getState().switchProject('p1')
    expect(useAssemblageStore.getState().clips).toHaveLength(1)
    expect(useAssemblageStore.getState().clips[0].name).toBe('clip-p1.mp4')
  })

  test('clears clips when switching to a different project with no saved state', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addClips([buildClip({ projectId: 'p1', name: 'clip-p1.mp4' })])
    useAssemblageStore.getState().switchProject('p2')
    expect(useAssemblageStore.getState().clips).toHaveLength(0)
  })

  test('clears audio tracks when switching to a different project with no saved state', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addAudioTracks([buildAudioTrack({ name: 'music.mp3' })])
    useAssemblageStore.getState().switchProject('p2')
    expect(useAssemblageStore.getState().audioTracks).toHaveLength(0)
  })

  test('clears annotations when switching project', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().setAnnotations('v1', [])
    useAssemblageStore.getState().switchProject('p2')
    expect(useAssemblageStore.getState().annotations).toEqual({})
  })

  test('restores clips when switching back to a previously active project', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addClips([buildClip({ projectId: 'p1', name: 'clip-p1.mp4' })])
    useAssemblageStore.getState().switchProject('p2')
    useAssemblageStore.getState().switchProject('p1')
    expect(useAssemblageStore.getState().clips).toHaveLength(1)
    expect(useAssemblageStore.getState().clips[0].name).toBe('clip-p1.mp4')
  })

  test('restores audio tracks when switching back to a previously active project', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addAudioTracks([buildAudioTrack({ name: 'beat.mp3' })])
    useAssemblageStore.getState().switchProject('p2')
    useAssemblageStore.getState().switchProject('p1')
    expect(useAssemblageStore.getState().audioTracks).toHaveLength(1)
    expect(useAssemblageStore.getState().audioTracks[0].name).toBe('beat.mp3')
  })

  test('keeps per-project state independent when both projects have clips', () => {
    useAssemblageStore.getState().switchProject('p1')
    useAssemblageStore.getState().addClips([buildClip({ projectId: 'p1', name: 'clip-p1.mp4' })])
    useAssemblageStore.getState().switchProject('p2')
    useAssemblageStore.getState().addClips([
      buildClip({ projectId: 'p2', name: 'clip-p2a.mp4' }),
      buildClip({ projectId: 'p2', name: 'clip-p2b.mp4' }),
    ])

    useAssemblageStore.getState().switchProject('p1')
    const p1Clips = useAssemblageStore.getState().clips
    expect(p1Clips).toHaveLength(1)
    expect(p1Clips[0].name).toBe('clip-p1.mp4')

    useAssemblageStore.getState().switchProject('p2')
    const p2Clips = useAssemblageStore.getState().clips
    expect(p2Clips).toHaveLength(2)
    expect(p2Clips.map((c) => c.name)).toEqual(['clip-p2a.mp4', 'clip-p2b.mp4'])
  })

  test('sets activeProjectId to the new project', () => {
    useAssemblageStore.getState().switchProject('p1')
    expect(useAssemblageStore.getState().activeProjectId).toBe('p1')
    useAssemblageStore.getState().switchProject('p2')
    expect(useAssemblageStore.getState().activeProjectId).toBe('p2')
  })

  test('handles switching from null (initial state) without saving null key', () => {
    useAssemblageStore.getState().switchProject('p1')
    expect(useAssemblageStore.getState().activeProjectId).toBe('p1')
    const keys = Object.keys(useAssemblageStore.getState().savedProjects)
    expect(keys).not.toContain('null')
    expect(keys).not.toContain('')
  })
})

describe('video clip timeline placement', () => {
  test('auto-places added clips sequentially by default', () => {
    useAssemblageStore.getState().addClips([
      buildClip({ id: 'c1', duration: 10 }),
      buildClip({ id: 'c2', duration: 5 }),
    ])

    const [first, second] = useAssemblageStore.getState().clips
    expect(getClipTimelineStart(first)).toBe(0)
    expect(getClipTimelineStart(second)).toBe(10)
    expect(getClipTimelineEnd(second)).toBe(15)
  })

  test('can move a video clip to create a black gap', () => {
    useAssemblageStore.getState().addClips([
      buildClip({ id: 'c1', duration: 10 }),
      buildClip({ id: 'c2', duration: 5 }),
    ])

    useAssemblageStore.getState().updateClipOffset('c2', 30)

    const second = useAssemblageStore.getState().clips.find((clip) => clip.id === 'c2')!
    expect(getClipTimelineStart(second)).toBe(30)
    expect(getClipTimelineEnd(second)).toBe(35)
  })

  test('prevents moving a video clip over the previous clip', () => {
    useAssemblageStore.getState().addClips([
      buildClip({ id: 'c1', duration: 10 }),
      buildClip({ id: 'c2', duration: 5 }),
    ])

    useAssemblageStore.getState().updateClipOffset('c2', 4)

    const second = useAssemblageStore.getState().clips.find((clip) => clip.id === 'c2')!
    expect(getClipTimelineStart(second)).toBe(10)
  })

  test('prevents moving a video clip over the next clip', () => {
    useAssemblageStore.getState().addClips([
      buildClip({ id: 'c1', duration: 10 }),
      buildClip({ id: 'c2', duration: 5 }),
    ])

    useAssemblageStore.getState().updateClipOffset('c1', 8)

    const first = useAssemblageStore.getState().clips.find((clip) => clip.id === 'c1')!
    expect(getClipTimelineStart(first)).toBe(0)
  })

  test('prevents extending a trim into the next video clip', () => {
    useAssemblageStore.getState().addClips([
      buildClip({ id: 'c1', duration: 20 }),
      buildClip({ id: 'c2', duration: 5 }),
    ])
    useAssemblageStore.getState().updateClipTrim('c1', 0, 10)
    useAssemblageStore.getState().updateClipOffset('c2', 12)

    useAssemblageStore.getState().updateClipTrim('c1', 0, 18)

    const first = useAssemblageStore.getState().clips.find((clip) => clip.id === 'c1')!
    expect(getClipTimelineEnd(first)).toBe(12)
  })

  test('reorders clips and places the moved first clip at the end without overlap', () => {
    useAssemblageStore.getState().addClips([
      buildClip({ id: 'c1', duration: 10 }),
      buildClip({ id: 'c2', duration: 5 }),
      buildClip({ id: 'c3', duration: 8 }),
    ])

    const [first, second, third] = useAssemblageStore.getState().clips
    useAssemblageStore.getState().reorderClips([second, third, first])

    const clips = useAssemblageStore.getState().clips
    expect(clips.map((clip) => clip.id)).toEqual(['c2', 'c3', 'c1'])
    expect(getClipTimelineStart(clips[0])).toBe(0)
    expect(getClipTimelineStart(clips[1])).toBe(5)
    expect(getClipTimelineStart(clips[2])).toBe(13)
  })

  test('can trim video clips without changing source duration', () => {
    useAssemblageStore.getState().addClips([buildClip({ id: 'c1', duration: 10 })])

    useAssemblageStore.getState().updateClipTrim('c1', 2, 7)

    const [clip] = useAssemblageStore.getState().clips
    expect(clip.duration).toBe(10)
    expect(clip.trimStart).toBe(2)
    expect(clip.trimEnd).toBe(7)
    expect(getClipEffectiveDuration(clip)).toBe(5)
  })
})

describe('clip fades', () => {
  test('computes fade-in opacity from local clip time', () => {
    const clip = buildClip({ duration: 10, fadeIn: true, fadeDurationS: 2 })

    expect(getClipFadeOpacity(clip, 0)).toBe(0)
    expect(getClipFadeOpacity(clip, 1)).toBe(0.5)
    expect(getClipFadeOpacity(clip, 2)).toBe(1)
  })

  test('computes fade-out opacity from local clip time', () => {
    const clip = buildClip({ duration: 10, fadeOut: true, fadeDurationS: 2 })

    expect(getClipFadeOpacity(clip, 8)).toBe(1)
    expect(getClipFadeOpacity(clip, 9)).toBe(0.5)
    expect(getClipFadeOpacity(clip, 10)).toBe(0)
  })

  test('clamps fade duration to half of the effective clip duration', () => {
    const clip = buildClip({ duration: 10, trimStart: 2, trimEnd: 5, fadeDurationS: 5 })

    expect(getClipEffectiveDuration(clip)).toBe(3)
    expect(getClipFadeDuration(clip)).toBe(1.5)
  })

  test('supports separate fade-in and fade-out durations', () => {
    const clip = buildClip({
      duration: 10,
      fadeIn: true,
      fadeOut: true,
      fadeInDurationS: 2,
      fadeOutDurationS: 3,
    })

    expect(getClipFadeInDuration(clip)).toBe(2)
    expect(getClipFadeOutDuration(clip)).toBe(3)
    expect(getClipFadeOpacity(clip, 1)).toBe(0.5)
    expect(getClipFadeOpacity(clip, 8.5)).toBe(0.5)
  })

  test('updateClipFade stores separate durations', () => {
    useAssemblageStore.getState().addClips([buildClip({ id: 'c1', duration: 10 })])

    useAssemblageStore.getState().updateClipFade('c1', true, true, 2, 3)

    const clip = useAssemblageStore.getState().clips[0]
    expect(clip.fadeInDurationS).toBe(2)
    expect(clip.fadeOutDurationS).toBe(3)
  })
})
