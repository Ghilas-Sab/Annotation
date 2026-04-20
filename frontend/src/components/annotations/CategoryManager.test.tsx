import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { CategoryManager } from './CategoryManager'
import { useCategories, useCreateCategory, useDeleteCategory } from '../../api/annotations'

vi.mock('../../api/annotations', () => ({
  useCategories: vi.fn(),
  useCreateCategory: vi.fn(),
  useDeleteCategory: vi.fn(),
}))

const mockCreate = vi.fn().mockResolvedValue({})
const mockDelete = vi.fn().mockResolvedValue({})

const defaultCategories = [
  { id: 'default', video_id: 'v1', name: 'Par défaut', color: '#9CA3AF', created_at: '' },
  { id: 'c1', video_id: 'v1', name: 'Beat', color: '#EF4444', created_at: '' },
]

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }, children)

beforeEach(() => {
  mockCreate.mockReset().mockResolvedValue({})
  mockDelete.mockReset().mockResolvedValue({})
  vi.mocked(useCategories).mockReturnValue({ data: defaultCategories } as never)
  vi.mocked(useCreateCategory).mockReturnValue({ mutateAsync: mockCreate, isPending: false } as never)
  vi.mocked(useDeleteCategory).mockReturnValue({ mutateAsync: mockDelete, isPending: false } as never)
})

describe('CategoryManager', () => {
  test('affiche les catégories existantes', () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    expect(screen.getByText('Par défaut')).toBeInTheDocument()
    expect(screen.getByText('Beat')).toBeInTheDocument()
  })

  test('affiche un badge coloré pour chaque catégorie', () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    const badges = screen.getAllByTestId('category-color-badge')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })

  test('le bouton supprimer est absent pour la catégorie par défaut', () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    const deleteButtons = screen.queryAllByRole('button', { name: /supprimer la catégorie/i })
    // Only non-default categories have delete buttons
    expect(deleteButtons.length).toBe(1)
  })

  test('crée une catégorie avec nom et couleur', async () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    await userEvent.type(screen.getByPlaceholderText(/nom de la catégorie/i), 'Temps fort')
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ name: 'Temps fort' }))
  })

  test('affiche un color picker pour choisir la couleur', () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    expect(screen.getByLabelText(/couleur/i)).toHaveAttribute('type', 'color')
  })

  test('ne crée pas si le nom est vide', async () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('affiche erreur si le nom existe déjà', async () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    await userEvent.type(screen.getByPlaceholderText(/nom de la catégorie/i), 'Beat')
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    expect(screen.getByText(/nom.*déjà utilisé/i)).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('affiche erreur si la couleur existe déjà', async () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    await userEvent.type(screen.getByPlaceholderText(/nom de la catégorie/i), 'NouveauNom')
    // Changer la couleur à celle de 'Beat' (#EF4444)
    fireEvent.change(screen.getByLabelText(/couleur/i), { target: { value: '#EF4444' } })
    await userEvent.click(screen.getByRole('button', { name: /ajouter/i }))
    expect(screen.getByText(/couleur.*déjà utilisée/i)).toBeInTheDocument()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  test('supprime une catégorie non-défaut', async () => {
    render(<CategoryManager videoId="v1" />, { wrapper })
    const deleteBtn = screen.getByRole('button', { name: /supprimer la catégorie/i })
    await userEvent.click(deleteBtn)
    expect(mockDelete).toHaveBeenCalledWith('c1')
  })
})
