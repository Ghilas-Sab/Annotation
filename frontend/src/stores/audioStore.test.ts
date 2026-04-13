import { describe, test, expect, beforeEach } from 'vitest'
import { useAudioStore } from './audioStore'

describe('audioStore', () => {
  beforeEach(() => {
    useAudioStore.setState({ enabled: false })
  })

  test('enabled is false by default', () => {
    expect(useAudioStore.getState().enabled).toBe(false)
  })

  test('toggle switches enabled from false to true', () => {
    useAudioStore.getState().toggle()
    expect(useAudioStore.getState().enabled).toBe(true)
  })

  test('toggle switches enabled from true to false', () => {
    useAudioStore.setState({ enabled: true })
    useAudioStore.getState().toggle()
    expect(useAudioStore.getState().enabled).toBe(false)
  })
})
