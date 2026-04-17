import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal'

describe('KeyboardShortcutsModal', () => {
  test('affiche le titre', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />)
    expect(screen.getByText(/raccourcis clavier/i)).toBeInTheDocument()
  })

  test('affiche tous les raccourcis', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />)
    expect(screen.getByText(/frame précédente/i)).toBeInTheDocument()
    expect(screen.getByText(/\+5 frames/i)).toBeInTheDocument()
    expect(screen.getByText(/créer une annotation/i)).toBeInTheDocument()
    expect(screen.getByText(/annuler la dernière annotation/i)).toBeInTheDocument()
    expect(screen.getByText(/saut inter-annotation/i)).toBeInTheDocument()
  })

  test('affiche le bouton de fermeture ✕', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: '✕' })).toBeInTheDocument()
  })

  test('appelle onClose au clic sur le bouton ✕', () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsModal onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  test('appelle onClose au clic sur le fond (backdrop)', () => {
    const onClose = vi.fn()
    const { container } = render(<KeyboardShortcutsModal onClose={onClose} />)
    // Le premier div est le backdrop
    fireEvent.click(container.firstChild as Element)
    expect(onClose).toHaveBeenCalledOnce()
  })

  test("ne propage pas le clic depuis l'intérieur de la modale", () => {
    const onClose = vi.fn()
    render(<KeyboardShortcutsModal onClose={onClose} />)
    // Clic sur le tableau — ne doit pas fermer
    fireEvent.click(screen.getByRole('table'))
    expect(onClose).not.toHaveBeenCalled()
  })

  test('affiche le texte explicatif des raccourcis désactivés', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />)
    expect(screen.getByText(/raccourcis sont désactivés/i)).toBeInTheDocument()
  })

  test('affiche le texte explicatif de la timeline', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />)
    expect(screen.getByText(/timeline/i)).toBeInTheDocument()
  })

  test('affiche les touches clavier dans des éléments kbd', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />)
    const kbds = document.querySelectorAll('kbd')
    expect(kbds.length).toBeGreaterThan(0)
  })
})
