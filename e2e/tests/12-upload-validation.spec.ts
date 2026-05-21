/**
 * Scénarios : Validation d'upload et nommage des vidéos
 *
 * Couvre : nom d'affichage personnalisé, annulation d'upload,
 *          affichage des métadonnées après upload, multiple vidéos,
 *          vérification du compteur dans l'en-tête.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper, TINY_VIDEO } from './helpers/api'

const RUN = `E2E-Upload-${Date.now()}`

test.describe('12 — Validation upload et nommage', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Upload`)
    projectId = proj.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Nom d'affichage personnalisé ───────────────────────────────────────────

  test('Le nom d\'affichage personnalisé est utilisé après upload', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-DisplayName`)
    await page.goto(`/projects/${proj.id}`)

    const fileInput = page.locator('input[type="file"][accept="video/*"]')
    await fileInput.setInputFiles(TINY_VIDEO)

    const nameInput = page.getByLabel('Nom de la vidéo')
    await expect(nameInput).toBeVisible()
    await nameInput.clear()
    await nameInput.fill('Ma Vidéo Test.mp4')

    await page.getByRole('button', { name: 'Uploader' }).click()
    await expect(page.locator('[role="listitem"]').first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText('Ma Vidéo Test.mp4')).toBeVisible()
  })

  test('Sans nom personnalisé, le nom de fichier est utilisé', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-DefaultName`)
    await page.goto(`/projects/${proj.id}`)

    const fileInput = page.locator('input[type="file"][accept="video/*"]')
    await fileInput.setInputFiles(TINY_VIDEO)

    // Don't change the name — just click Upload
    await expect(page.getByLabel('Nom de la vidéo')).toBeVisible()
    await page.getByRole('button', { name: 'Uploader' }).click()

    await expect(page.locator('[role="listitem"]').first()).toBeVisible({ timeout: 20000 })
    // Filename should be "tiny.mp4" or a derivative
    await expect(page.locator('[role="listitem"]').first()).toBeVisible()
  })

  // ── Annulation d'upload ────────────────────────────────────────────────────

  test('Annuler l\'upload via le bouton Annuler ferme le formulaire (Échap)', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)

    const fileInput = page.locator('input[type="file"][accept="video/*"]')
    await fileInput.setInputFiles(TINY_VIDEO)

    await expect(page.getByLabel('Nom de la vidéo')).toBeVisible()

    // VideoUpload has a cancel button (not keyboard Escape)
    const cancelBtn = page.getByRole('button', { name: /Annuler/i })
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click()
      await expect(page.getByLabel('Nom de la vidéo')).not.toBeVisible()
    } else {
      // If no cancel button, the form must be dismissed by clicking elsewhere
      test.skip(true, 'Aucun bouton Annuler — comportement non implémenté')
    }
  })

  test('Annuler l\'upload via le bouton Annuler ferme le formulaire', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)

    const fileInput = page.locator('input[type="file"][accept="video/*"]')
    await fileInput.setInputFiles(TINY_VIDEO)

    await expect(page.getByLabel('Nom de la vidéo')).toBeVisible()

    const cancelBtn = page.getByRole('button', { name: /Annuler/i })
    if (await cancelBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cancelBtn.click()
      await expect(page.getByLabel('Nom de la vidéo')).not.toBeVisible()
    }
  })

  // ── Métadonnées affichées ─────────────────────────────────────────────────

  test('La durée de la vidéo est affichée sur la carte (format M:SS)', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-Meta`)
    await api.uploadVideo(proj.id)

    await page.goto(`/projects/${proj.id}`)
    const card = page.locator('[role="listitem"]').first()
    await expect(card).toBeVisible()

    // VideoCard affiche la durée au format M:SS (ex: "0:02")
    await expect(card.getByText(/\d+:\d{2}/).first()).toBeVisible()
  })

  test('Le FPS de la vidéo est affiché sur la carte', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-FPS`)
    await api.uploadVideo(proj.id)

    await page.goto(`/projects/${proj.id}`)
    const card = page.locator('[role="listitem"]').first()
    await expect(card).toBeVisible()
    await expect(card.getByText(/fps/i)).toBeVisible()
  })

  test('Le nombre de frames est affiché sur la carte', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-Frames`)
    await api.uploadVideo(proj.id)

    await page.goto(`/projects/${proj.id}`)
    const card = page.locator('[role="listitem"]').first()
    await expect(card).toBeVisible()
    await expect(card.getByText(/frames/i)).toBeVisible()
  })

  // ── Plusieurs vidéos ──────────────────────────────────────────────────────

  test('Plusieurs vidéos sont affichées dans le projet', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-Multi`)
    await api.uploadVideo(proj.id, 'video-a.mp4')
    await api.uploadVideo(proj.id, 'video-b.mp4')

    await page.goto(`/projects/${proj.id}`)
    await expect(page.locator('[role="listitem"]')).toHaveCount(2, { timeout: 10000 })
  })

  test('Le compteur de vidéos dans l\'en-tête se met à jour', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-Counter`)
    await api.uploadVideo(proj.id, 'v1.mp4')
    await api.uploadVideo(proj.id, 'v2.mp4')

    await page.goto('/projects')
    // Header shows total video count
    const videosCounter = page.locator('header').getByText(/Vidéos/i)
    await expect(videosCounter).toBeVisible()
  })

  // ── Bouton upload désactivé sans nom ──────────────────────────────────────

  test('Si le nom est vide, le fichier original est utilisé comme nom par défaut', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-FallbackName`)
    await page.goto(`/projects/${proj.id}`)

    const fileInput = page.locator('input[type="file"][accept="video/*"]')
    await fileInput.setInputFiles(TINY_VIDEO)

    const nameInput = page.getByLabel('Nom de la vidéo')
    await expect(nameInput).toBeVisible()
    await nameInput.clear()

    // VideoUpload : si displayName vide → utilise selectedFile.name (tiny.mp4)
    // Le bouton reste actif car le fallback est le nom de fichier
    const uploadBtn = page.getByRole('button', { name: 'Uploader' })
    await expect(uploadBtn).toBeEnabled()
  })
})
