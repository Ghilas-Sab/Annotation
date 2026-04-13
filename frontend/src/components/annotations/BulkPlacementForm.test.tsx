import { render, screen, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BulkPlacementForm from './BulkPlacementForm'
import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import React from 'react'

const server = setupServer()
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

const renderWithQuery = (ui: React.ReactElement) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('BulkPlacementForm', () => {
  it('shows interval preview', async () => {
    renderWithQuery(<BulkPlacementForm videoId="1" totalFrames={100} fps={25} />)
    
    // Valeurs par défaut : start=0, end=100, count=4
    // (100 - 0) / (4 - 1) = 33.33 frames
    expect(screen.getByText(/33.3/i)).toBeInTheDocument()

    // Changer count à 5 -> (100-0)/(5-1) = 25
    fireEvent.change(screen.getByLabelText(/Nombre d'annotations/i), { target: { value: '5' } })
    expect(screen.getByText(/25.0/i)).toBeInTheDocument()
  })

  it('disables submit when start >= end', async () => {
    renderWithQuery(<BulkPlacementForm videoId="1" totalFrames={100} fps={25} />)
    
    const startInput = screen.getByLabelText(/Début/i)
    const endInput = screen.getByLabelText(/Fin/i)
    const submitBtn = screen.getByText(/Placer les annotations/i)

    // Cas valide
    expect(submitBtn).not.toBeDisabled()

    // Cas invalide
    fireEvent.change(startInput, { target: { value: '50' } })
    fireEvent.change(endInput, { target: { value: '50' } })
    expect(submitBtn).toBeDisabled()
  })
})
