import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import VideoTrimModal from './VideoTrimModal'
import type { Video } from '../../types/project'

const mockVideo: Video = {
  id: 'v1',
  project_id: 'p1',
  filename: 'dance.mp4',
  original_name: 'dance.mp4',
  fps: 25,
  duration_seconds: 40,
  total_frames: 1000,
  width: 1920,
  height: 1080,
  codec: 'h264',
  uploaded_at: '2024-01-01T00:00:00Z',
  annotations: [],
}

describe('VideoTrimModal', () => {
  test('affiche le titre "Annoter une vidéo"', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/annoter une vidéo/i)).toBeInTheDocument()
  })

  test('affiche le nom original de la vidéo', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/dance\.mp4/i)).toBeInTheDocument()
  })

  test('affiche les infos de la vidéo dans la description', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    // Le paragraphe d'info contient les 3 valeurs
    const infoText = screen.getByText(/dance\.mp4/)
    expect(infoText).toHaveTextContent('1000 frames')
    expect(infoText).toHaveTextContent('25 FPS')
    expect(infoText).toHaveTextContent('40.0s')
  })

  test('les sliders début et fin sont présents', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    expect(sliders).toHaveLength(2)
  })

  test('bouton "Toute la vidéo" appelle onConfirm(0, total_frames)', () => {
    const onConfirm = vi.fn()
    render(<VideoTrimModal video={mockVideo} onConfirm={onConfirm} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /toute la vidéo/i }))
    expect(onConfirm).toHaveBeenCalledWith(0, 1000)
  })

  test('bouton "Annoter cette plage" est désactivé quand sélection = vidéo complète', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByRole('button', { name: /annoter cette plage/i })).toBeDisabled()
  })

  test('appelle onCancel au clic sur le backdrop', () => {
    const onCancel = vi.fn()
    const { container } = render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(container.firstChild as Element)
    expect(onCancel).toHaveBeenCalledOnce()
  })

  test("le clic à l'intérieur ne ferme pas la modale", () => {
    const onCancel = vi.fn()
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText(/annoter une vidéo/i))
    expect(onCancel).not.toHaveBeenCalled()
  })

  test('changer le slider début met à jour l\'affichage dans le libellé Début', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '100' } })
    // Le span du libellé "Début" affiche "Frame 100"
    const debutSection = screen.getByText(/^Début$/).closest('div')!
    expect(within(debutSection).getByText(/frame 100/i)).toBeInTheDocument()
  })

  test('changer le slider fin met à jour l\'affichage dans le libellé Fin', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '0' } })
    fireEvent.change(sliders[1], { target: { value: '500' } })
    const finSection = screen.getByText(/^Fin$/).closest('div')!
    expect(within(finSection).getByText(/frame 500/i)).toBeInTheDocument()
  })

  test('le slider début ne peut pas dépasser la fin - 1', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    // fin est à 1000, si on met début à 1001 → clampé à fin-1 = 999
    fireEvent.change(sliders[0], { target: { value: '1001' } })
    const debutSection = screen.getByText(/^Début$/).closest('div')!
    expect(within(debutSection).getByText(/frame 999/i)).toBeInTheDocument()
  })

  test('le slider fin ne peut pas descendre sous début + 1', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '500' } })
    fireEvent.change(sliders[1], { target: { value: '200' } })
    // clampé à max(200, 500+1) = 501
    const finSection = screen.getByText(/^Fin$/).closest('div')!
    expect(within(finSection).getByText(/frame 501/i)).toBeInTheDocument()
  })

  test('affiche "vidéo complète" quand sélection = plage entière', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.getByText(/vidéo complète/)).toBeInTheDocument()
  })

  test('bouton "Annoter cette plage" actif après changement de slider', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '100' } })
    expect(screen.getByRole('button', { name: /annoter cette plage/i })).not.toBeDisabled()
  })

  test('bouton "Annoter cette plage" appelle onConfirm avec start et end', () => {
    const onConfirm = vi.fn()
    render(<VideoTrimModal video={mockVideo} onConfirm={onConfirm} onCancel={vi.fn()} />)
    const sliders = screen.getAllByRole('slider')
    fireEvent.change(sliders[0], { target: { value: '100' } })
    fireEvent.click(screen.getByRole('button', { name: /annoter cette plage/i }))
    expect(onConfirm).toHaveBeenCalledWith(100, 1000)
  })

  test('affiche le compte de frames dans le résumé de sélection', () => {
    render(<VideoTrimModal video={mockVideo} onConfirm={vi.fn()} onCancel={vi.fn()} />)
    // Le résumé contient un <strong> avec le nombre de frames
    const strong = document.querySelector('strong')
    expect(strong?.textContent).toMatch(/1000/)
  })
})
