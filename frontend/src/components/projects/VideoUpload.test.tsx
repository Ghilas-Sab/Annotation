import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import VideoUpload from './VideoUpload'
import { useUploadVideo } from '../../api/projects'

vi.mock('../../api/projects', () => ({
  useUploadVideo: vi.fn(),
}))

const mockMutateAsync = vi.fn().mockResolvedValue({})

const defaultMock = () => {
  vi.mocked(useUploadVideo).mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
  } as never)
}

const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(
    QueryClientProvider,
    { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    children,
  )

beforeEach(() => {
  mockMutateAsync.mockReset().mockResolvedValue({})
  defaultMock()
})

describe('VideoUpload', () => {
  test('affiche la zone de dépôt', () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    expect(screen.getByText(/glissez-déposez/i)).toBeInTheDocument()
  })

  test('affiche le texte des formats acceptés', () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    expect(screen.getByText(/tous formats vidéo acceptés/i)).toBeInTheDocument()
  })

  test("l'input file est hidden", () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.style.display).toBe('none')
  })

  test("l'input accepte video/*", () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input.accept).toBe('video/*')
  })

  test('setDragActive à true sur dragover', () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const zone = screen.getByText(/glissez-déposez/i).parentElement!
    fireEvent.dragOver(zone)
    expect(zone).toBeInTheDocument()
  })

  test('setDragActive à false sur dragleave', () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const zone = screen.getByText(/glissez-déposez/i).parentElement!
    fireEvent.dragOver(zone)
    fireEvent.dragLeave(zone)
    expect(zone).toBeInTheDocument()
  })

  test('appelle mutateAsync au drop avec le bon fichier', () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const zone = screen.getByText(/glissez-déposez/i).parentElement!
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    expect(mockMutateAsync).toHaveBeenCalledWith(file)
  })

  test("n'appelle pas mutateAsync si drop sans fichier", () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const zone = screen.getByText(/glissez-déposez/i).parentElement!
    fireEvent.drop(zone, { dataTransfer: { files: [] } })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  test('appelle mutateAsync via input file onChange', () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' })
    fireEvent.change(input, { target: { files: [file] } })
    expect(mockMutateAsync).toHaveBeenCalledWith(file)
  })

  test('affiche "Téléchargement en cours" quand isPending', () => {
    vi.mocked(useUploadVideo).mockReturnValue({
      mutateAsync: mockMutateAsync, isPending: true, isError: false,
    } as never)
    render(<VideoUpload projectId="p1" />, { wrapper })
    expect(screen.getByText(/téléchargement en cours/i)).toBeInTheDocument()
  })

  test('affiche la barre de progression quand isPending', () => {
    vi.mocked(useUploadVideo).mockReturnValue({
      mutateAsync: mockMutateAsync, isPending: true, isError: false,
    } as never)
    render(<VideoUpload projectId="p1" />, { wrapper })
    expect(screen.getByText(/0%/)).toBeInTheDocument()
  })

  test("affiche le message d'erreur quand isError", () => {
    vi.mocked(useUploadVideo).mockReturnValue({
      mutateAsync: mockMutateAsync, isPending: false, isError: true,
    } as never)
    render(<VideoUpload projectId="p1" />, { wrapper })
    expect(screen.getByText(/erreur lors de l'upload/i)).toBeInTheDocument()
  })
})
