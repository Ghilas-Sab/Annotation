import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
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
})
