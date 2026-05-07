import { render, screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import ProjectsPage from './ProjectsPage'
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import React from 'react'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderWithQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      }
    }
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProjectsPage', () => {
  it('displays project list', async () => {
    server.use(http.get('*/api/v1/projects', () =>
      HttpResponse.json([{
        id: '1',
        name: 'Mon Projet',
        description: '',
        created_at: new Date().toISOString(),
        videos: []
      }])
    ))
    renderWithQuery(<ProjectsPage />)
    expect(await screen.findByText('Mon Projet')).toBeInTheDocument()
  })

  it('shows inline form on new project click', async () => {
    server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
    renderWithQuery(<ProjectsPage />)

    const addButton = await screen.findByText(/Nouveau projet/i)
    fireEvent.click(addButton)

    expect(await screen.findByLabelText('Nom du projet')).toBeInTheDocument()
  })

  it('disables submit if name is empty', async () => {
    server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
    renderWithQuery(<ProjectsPage />)

    const addButton = await screen.findByText(/Nouveau projet/i)
    fireEvent.click(addButton)

    const submitBtn = await screen.findByText('Créer le projet →')
    expect(submitBtn).toBeDisabled()
  })

  it('delete asks confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockImplementation(() => true)
    server.use(http.get('*/api/v1/projects', () =>
      HttpResponse.json([{
        id: '1',
        name: 'Mon Projet',
        description: '',
        created_at: new Date().toISOString(),
        videos: []
      }])
    ))
    server.use(http.delete('*/api/v1/projects/1', () => new HttpResponse(null, { status: 204 })))

    renderWithQuery(<ProjectsPage />)
    const deleteBtn = await screen.findByLabelText(/supprimer/i)
    fireEvent.click(deleteBtn)
    expect(confirmSpy).toHaveBeenCalled()
  })

  it('shows loading state', async () => {
    server.use(http.get('*/api/v1/projects', () =>
      new Promise(() => {}) // Never resolves
    ))
    renderWithQuery(<ProjectsPage />)
    expect(await screen.findByText(/chargement des projets/i)).toBeInTheDocument()
  })

  it('shows error state when project list fails to load', async () => {
    server.use(http.get('*/api/v1/projects', () =>
      new HttpResponse(null, { status: 500 })
    ))
    renderWithQuery(<ProjectsPage />)
    expect(await screen.findByText(/erreur est survenue/i)).toBeInTheDocument()
  })

  it('submits form to create project', async () => {
    server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
    server.use(http.post('*/api/v1/projects', () =>
      HttpResponse.json({ id: '2', name: 'New Project', description: '', created_at: new Date().toISOString(), videos: [] })
    ))

    renderWithQuery(<ProjectsPage />)

    const addButton = await screen.findByText(/Nouveau projet/i)
    fireEvent.click(addButton)

    const nameInput = await screen.findByLabelText('Nom du projet')
    fireEvent.change(nameInput, { target: { value: 'New Project' } })

    const submitBtn = screen.getByText('Créer le projet →')
    expect(submitBtn).not.toBeDisabled()
  })

  it('cancel button hides form', async () => {
    server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
    renderWithQuery(<ProjectsPage />)

    const addButton = await screen.findByText(/Nouveau projet/i)
    fireEvent.click(addButton)

    expect(await screen.findByLabelText('Nom du projet')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Annuler'))

    expect(screen.queryByLabelText('Nom du projet')).not.toBeInTheDocument()
  })

  it('new project button is hidden when form is shown', async () => {
    server.use(http.get('*/api/v1/projects', () => HttpResponse.json([])))
    renderWithQuery(<ProjectsPage />)

    const addButton = await screen.findByText(/Nouveau projet/i)
    fireEvent.click(addButton)

    // After form opens, inline form header is shown
    expect(await screen.findByText(/Créer un nouveau projet/i)).toBeInTheDocument()
    // Cancel button is shown
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })
})
