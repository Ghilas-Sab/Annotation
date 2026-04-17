import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShiftForm from './ShiftForm'

describe('ShiftForm', () => {
  test('affiche le titre', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    expect(screen.getByText(/décaler toutes les annotations/i)).toBeInTheDocument()
  })

  test('affiche le label du champ', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    expect(screen.getByLabelText(/décalage en frames/i)).toBeInTheDocument()
  })

  test('le bouton est désactivé si la valeur est vide', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    expect(screen.getByRole('button', { name: /décaler/i })).toBeDisabled()
  })

  test('le bouton est désactivé si la valeur est 0', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '0' } })
    expect(screen.getByRole('button', { name: /décaler/i })).toBeDisabled()
  })

  test('le bouton est actif avec une valeur positive', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '5' } })
    expect(screen.getByRole('button', { name: /décaler/i })).not.toBeDisabled()
  })

  test('le bouton est actif avec une valeur négative', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '-3' } })
    expect(screen.getByRole('button', { name: /décaler/i })).not.toBeDisabled()
  })

  test('soumettre avec valeur positive appelle onShift', () => {
    const onShift = vi.fn()
    render(<ShiftForm onShift={onShift} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '5' } })
    fireEvent.submit(screen.getByRole('button', { name: /décaler/i }).closest('form')!)
    expect(onShift).toHaveBeenCalledWith(5)
  })

  test('soumettre avec valeur négative appelle onShift avec entier négatif', () => {
    const onShift = vi.fn()
    render(<ShiftForm onShift={onShift} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '-3' } })
    fireEvent.submit(screen.getByRole('button', { name: /décaler/i }).closest('form')!)
    expect(onShift).toHaveBeenCalledWith(-3)
  })

  test('le champ est réinitialisé après soumission', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    const input = screen.getByLabelText(/décalage en frames/i)
    fireEvent.change(input, { target: { value: '7' } })
    fireEvent.submit(input.closest('form')!)
    expect((input as HTMLInputElement).value).toBe('')
  })

  test("n'appelle pas onShift si la valeur est invalide", () => {
    const onShift = vi.fn()
    render(<ShiftForm onShift={onShift} isPending={false} isError={false} />)
    fireEvent.submit(screen.getByLabelText(/décalage en frames/i).closest('form')!)
    expect(onShift).not.toHaveBeenCalled()
  })

  test('affiche "Décalage..." quand isPending', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={true} isError={false} />)
    expect(screen.getByText(/décalage\.\.\./i)).toBeInTheDocument()
  })

  test('le bouton est désactivé quand isPending', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={true} isError={false} />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  test('affiche le message d\'erreur quand isError', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={true} />)
    expect(screen.getByText(/erreur lors du décalage/i)).toBeInTheDocument()
  })

  test("n'affiche pas d'erreur quand isError est false", () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    expect(screen.queryByText(/erreur lors du décalage/i)).not.toBeInTheDocument()
  })

  test('le label du bouton affiche le signe + pour valeur positive', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '3' } })
    expect(screen.getByRole('button', { name: /\+3/i })).toBeInTheDocument()
  })

  test('le label du bouton affiche le signe - pour valeur négative', () => {
    render(<ShiftForm onShift={vi.fn()} isPending={false} isError={false} />)
    fireEvent.change(screen.getByLabelText(/décalage en frames/i), { target: { value: '-2' } })
    expect(screen.getByRole('button', { name: /-2/i })).toBeInTheDocument()
  })
})
