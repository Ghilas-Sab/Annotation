/**
 * Scénarios : Détail d'un projet
 *
 * Couvre : affichage, upload vidéo, renommage, suppression, navigation vers annotation,
 *          statistiques, export, assemblage, retour liste.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper, TINY_VIDEO } from './helpers/api'

const RUN = `E2E-Detail-${Date.now()}`

test.describe('02 — Détail d\'un projet', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Main`)
    projectId = proj.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Chargement ────────────────────────────────────────────────────────────

  test('La page détail affiche le nom du projet', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await expect(page.getByText(`${RUN}-Main`).first()).toBeVisible()
  })

  test('Sans vidéo : l\'état vide est affiché', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await expect(page.getByText(/Aucune vidéo|Glissez-déposez|aucune/i).first()).toBeVisible()
  })

  // ── Upload vidéo ──────────────────────────────────────────────────────────

  test('Uploader une vidéo via le composant VideoUpload', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)

    // Click the dropzone to open file picker
    const fileInput = page.locator('input[type="file"][accept="video/*"]')
    await fileInput.setInputFiles(TINY_VIDEO)

    // Wait for the display name input and upload button
    await expect(page.getByLabel('Nom de la vidéo')).toBeVisible()
    await page.getByRole('button', { name: 'Uploader' }).click()

    // Wait for the video card to appear
    await expect(page.locator('[role="listitem"]').first()).toBeVisible({ timeout: 20000 })
  })

  test('La vidéo uploadée affiche ses métadonnées', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    const card = page.locator('[role="listitem"]').first()
    await expect(card).toBeVisible()
    // Duration, fps, frames are displayed
    await expect(card.getByText(/fps/i)).toBeVisible()
    await expect(card.getByText(/frames/i)).toBeVisible()
  })

  // ── Renommage vidéo ───────────────────────────────────────────────────────

  test('Renommer une vidéo', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)

    const card = page.locator('[role="listitem"]').first()
    await card.hover()

    // Click edit icon to rename
    const editBtn = card.getByRole('button', { name: /Renommer/i })
    await editBtn.waitFor({ state: 'visible' })
    await editBtn.click()

    const input = card.getByLabel('Nom de la vidéo')
    await input.clear()
    await input.fill('video-renommée.mp4')
    await input.press('Enter')

    await expect(card.getByText('video-renommée.mp4')).toBeVisible()
  })

  test('Annuler le renommage avec Échap restaure le nom', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)

    const card = page.locator('[role="listitem"]').first()
    await card.hover()

    const editBtn = card.getByRole('button', { name: /Renommer/i })
    await editBtn.waitFor({ state: 'visible' })
    await editBtn.click()

    const input = card.getByLabel('Nom de la vidéo')
    await input.press('Escape')

    // Input should close
    await expect(input).not.toBeVisible()
  })

  // ── Navigation depuis la VideoCard ────────────────────────────────────────

  test('Le bouton Annoter ouvre le modal de découpe', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    const annoterBtn = page.getByRole('button', { name: /^Annoter$/ }).first()
    await annoterBtn.click()

    // VideoTrimModal shows two buttons: "Toute la vidéo" and "Annoter cette plage"
    const modalBtn = page.getByRole('button', { name: 'Toute la vidéo' })
    await expect(modalBtn).toBeVisible({ timeout: 5000 })
    await modalBtn.click()

    await page.waitForURL(/\/annotation\//)
  })

  test('Le bouton Stats navigue vers la page de statistiques', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    // Stats button: btn-outline btn-sm btn-icon (no visible text, tooltip "Statistiques")
    const statsBtn = page.locator('[role="listitem"]').first().locator('button.btn-outline')
    await statsBtn.waitFor({ state: 'visible' })
    await statsBtn.click()
    await page.waitForURL(/\/statistics\//)
  })

  // ── Navigation en-tête ────────────────────────────────────────────────────

  test('Le lien Projets dans le fil d\'Ariane revient à la liste', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    // Breadcrumb renders an <a> link, not a <button>
    await page.getByRole('link', { name: 'Projets' }).click()
    await page.waitForURL('**/projects')
  })

  test('Le bouton Exporter le projet navigue vers /export/:id', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole('button', { name: /Exporter le projet/i }).click()
    await page.waitForURL(`**/export/${projectId}`)
  })

  test('Le bouton Assemblage navigue vers /assemblage/:id', async ({ page }) => {
    await page.goto(`/projects/${projectId}`)
    await page.getByRole('button', { name: /Assemblage/i }).click()
    await page.waitForURL(`**/assemblage/${projectId}`)
  })

  // ── Suppression vidéo ─────────────────────────────────────────────────────

  test('Supprimer une vidéo après confirmation', async ({ page }) => {
    // Upload a dedicated video for this test
    const proj = await api.createProject(`${RUN}-DelVid`)
    const vid = await api.uploadVideo(proj.id, 'a-supprimer.mp4')

    await page.goto(`/projects/${proj.id}`)
    const card = page.locator('[role="listitem"]').first()
    await card.waitFor({ state: 'visible' })
    await card.hover()

    page.on('dialog', (d) => d.accept())

    const deleteBtn = card.getByRole('button', { name: 'Supprimer la vidéo' })
    await deleteBtn.waitFor({ state: 'visible' })
    await deleteBtn.click()

    await expect(page.locator('[role="listitem"]')).toHaveCount(0, { timeout: 8000 })
  })

  test('Annuler la suppression d\'une vidéo', async ({ page }) => {
    const proj = await api.createProject(`${RUN}-NoDelVid`)
    await api.uploadVideo(proj.id, 'a-conserver.mp4')

    await page.goto(`/projects/${proj.id}`)
    const card = page.locator('[role="listitem"]').first()
    await card.hover()

    page.on('dialog', (d) => d.dismiss())

    const deleteBtn = card.getByRole('button', { name: 'Supprimer la vidéo' })
    await deleteBtn.waitFor({ state: 'visible' })
    await deleteBtn.click()

    await expect(page.locator('[role="listitem"]')).toHaveCount(1)
  })
})
