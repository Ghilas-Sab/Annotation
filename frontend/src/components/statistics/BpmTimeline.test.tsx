import { describe, test, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BpmTimeline from './BpmTimeline'
import type { RhythmicSegment } from '../../types/statistics'

const makeSegment = (start: number, end: number, bpm: number): RhythmicSegment => ({
  start_frame: Math.round(start * 25),
  end_frame: Math.round(end * 25),
  start_seconds: start,
  end_seconds: end,
  bpm,
  annotation_count: 2,
})

describe('BpmTimeline', () => {
  test('affiche le titre', () => {
    render(<BpmTimeline segments={[]} bpmGlobal={0} bpmVariation={0} />)
    expect(screen.getByText(/évolution du BPM dans le temps/i)).toBeInTheDocument()
  })

  test('affiche le texte explicatif', () => {
    render(<BpmTimeline segments={[]} bpmGlobal={0} bpmVariation={0} />)
    expect(screen.getByText(/ligne pointillée bleue/i)).toBeInTheDocument()
  })

  test('rend un canvas', () => {
    render(<BpmTimeline segments={[]} bpmGlobal={0} bpmVariation={0} />)
    expect(document.querySelector('canvas')).toBeInTheDocument()
  })

  test('canvas avec aria-label', () => {
    render(<BpmTimeline segments={[]} bpmGlobal={128} bpmVariation={10} />)
    const canvas = document.querySelector('canvas')
    expect(canvas?.getAttribute('aria-label')).toMatch(/évolution du BPM/i)
  })

  test('rend sans erreur avec segments vides et bpmGlobal=0', () => {
    expect(() =>
      render(<BpmTimeline segments={[]} bpmGlobal={0} bpmVariation={0} />)
    ).not.toThrow()
  })

  test('rend sans erreur avec des segments valides', () => {
    const segments = [
      makeSegment(0, 5, 120),
      makeSegment(5, 10, 130),
      makeSegment(10, 15, 125),
    ]
    expect(() =>
      render(<BpmTimeline segments={segments} bpmGlobal={125} bpmVariation={8} />)
    ).not.toThrow()
  })

  test('rend sans erreur avec un seul segment', () => {
    expect(() =>
      render(<BpmTimeline segments={[makeSegment(0, 10, 120)]} bpmGlobal={120} bpmVariation={0} />)
    ).not.toThrow()
  })

  test('rend sans erreur avec bpmVariation = 0', () => {
    const segments = [makeSegment(0, 5, 120), makeSegment(5, 10, 125)]
    expect(() =>
      render(<BpmTimeline segments={segments} bpmGlobal={122} bpmVariation={0} />)
    ).not.toThrow()
  })

  test('affiche le pourcentage de variation dans le texte', () => {
    render(<BpmTimeline segments={[]} bpmGlobal={120} bpmVariation={15} />)
    expect(screen.getByText(/15%/)).toBeInTheDocument()
  })

  test('rend sans erreur avec 7 segments (nX max)', () => {
    const segments = Array.from({ length: 7 }, (_, i) => makeSegment(i * 5, (i + 1) * 5, 100 + i * 5))
    expect(() =>
      render(<BpmTimeline segments={segments} bpmGlobal={120} bpmVariation={10} />)
    ).not.toThrow()
  })

  test('rend sans erreur avec bpmVariation > 0 et segments présents', () => {
    const segments = [makeSegment(0, 10, 120), makeSegment(10, 20, 130)]
    expect(() =>
      render(<BpmTimeline segments={segments} bpmGlobal={125} bpmVariation={5} />)
    ).not.toThrow()
  })
})
