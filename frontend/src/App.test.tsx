import { render, screen } from '@testing-library/react'
import App from './App'
import { test, expect, beforeAll, afterEach, afterAll } from 'vitest'
import React from 'react'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('*/api/v1/projects', () => HttpResponse.json([]))
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('app renders without crash', async () => {
  render(<App />)
  expect(await screen.findByText(/Gestion des Projets/i)).toBeInTheDocument()
})
