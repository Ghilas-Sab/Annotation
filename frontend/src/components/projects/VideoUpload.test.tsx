import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
    expect(screen.getByText(/MP4.*MOV.*AVI/i)).toBeInTheDocument()
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

  test('appelle mutateAsync au drop avec le bon fichier', async () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const zone = screen.getByText(/glissez-déposez/i).parentElement!
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' })
    fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    await userEvent.click(screen.getByRole('button', { name: /uploader/i }))
    expect(mockMutateAsync).toHaveBeenCalledWith({ file, displayName: 'video.mp4' })
  })

  test("n'appelle pas mutateAsync si drop sans fichier", () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const zone = screen.getByText(/glissez-déposez/i).parentElement!
    fireEvent.drop(zone, { dataTransfer: { files: [] } })
    expect(mockMutateAsync).not.toHaveBeenCalled()
  })

  test('appelle mutateAsync via input file onChange', async () => {
    render(<VideoUpload projectId="p1" />, { wrapper })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'video.mp4', { type: 'video/mp4' })
    fireEvent.change(input, { target: { files: [file] } })
    await userEvent.click(screen.getByRole('button', { name: /uploader/i }))
    expect(mockMutateAsync).toHaveBeenCalledWith({ file, displayName: 'video.mp4' })
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

  // S6.2 — Renommage vidéo à l'import
  test('shows editable name field after file selection', async () => {
    render(<VideoUpload projectId="uuid-1" />, { wrapper })
    const file = new File(['video'], 'my_recording.mp4', { type: 'video/mp4' })
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
    const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i })
    expect(nameInput).toHaveValue('my_recording.mp4')
  })

  test('sends display_name to backend on upload', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ id: 'uuid-v1', original_name: 'Ma vidéo' })
    render(<VideoUpload projectId="uuid-1" onUpload={mockUpload} />, { wrapper })
    const file = new File(['video'], 'raw.mp4', { type: 'video/mp4' })
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
    const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i })
    await userEvent.clear(nameInput)
    await userEvent.type(nameInput, 'Ma vidéo')
    await userEvent.click(screen.getByRole('button', { name: /uploader/i }))
    expect(mockUpload).toHaveBeenCalledWith(expect.objectContaining({ displayName: 'Ma vidéo' }))
  })

  test('falls back to filename if name field is emptied', async () => {
    render(<VideoUpload projectId="uuid-1" />, { wrapper })
    const file = new File(['video'], 'original.mp4', { type: 'video/mp4' })
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
    const nameInput = await screen.findByRole('textbox', { name: /nom de la vidéo/i })
    await userEvent.clear(nameInput)
    await userEvent.tab()
    expect(nameInput).toHaveValue('original.mp4')
  })

  test('clears name field after successful upload', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ id: 'uuid-v1' })
    render(<VideoUpload projectId="uuid-1" onUpload={mockUpload} />, { wrapper })
    const file = new File(['video'], 'test.mp4', { type: 'video/mp4' })
    fireEvent.drop(screen.getByTestId('dropzone'), { dataTransfer: { files: [file] } })
    await userEvent.click(screen.getByRole('button', { name: /uploader/i }))
    await waitFor(() => expect(screen.queryByRole('textbox')).not.toBeInTheDocument())
  })
})
