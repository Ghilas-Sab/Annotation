import { useRef, useCallback } from 'react'

export const playBeep = (context: AudioContext): void => {
  const oscillator = context.createOscillator()
  const gain = context.createGain()

  oscillator.connect(gain)
  gain.connect(context.destination)

  oscillator.frequency.value = 880
  oscillator.type = 'sine'

  const now = context.currentTime
  gain.gain.setValueAtTime(0.3, now)
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

  oscillator.start(now)
  oscillator.stop(now + 0.05)
}

export const useAudioBeep = () => {
  const contextRef = useRef<AudioContext | null>(null)

  const beep = useCallback(() => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext()
    }
    if (contextRef.current.state === 'suspended') {
      contextRef.current.resume()
    }
    playBeep(contextRef.current)
  }, [])

  return { beep }
}
