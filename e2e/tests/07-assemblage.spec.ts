/**
 * Scénarios : Page d'assemblage
 *
 * Couvre : chargement, timeline, panneau export, import modal,
 *          ajout de clip, navigation retour.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Asm-${Date.now()}`

test.describe('07 — Assemblage', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Asm`)
    projectId = proj.id
    const vid = await api.uploadVideo(proj.id)
    videoId = vid.id
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Chargement ────────────────────────────────────────────────────────────

  test('La page d\'assemblage se charge', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)
    await expect(page.getByText(/Assemblage|Timeline|assemblage/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('La topbar affiche le nom du projet', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)
    await expect(page.getByText(`${RUN}-Asm`)).toBeVisible({ timeout: 10000 })
  })

  // ── Timeline ──────────────────────────────────────────────────────────────

  test('La zone de timeline est visible', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)
    // The AssemblageTimeline component renders an SVG or canvas
    await expect(page.locator('[class*="timeline"], canvas, svg').first()).toBeVisible({ timeout: 10000 })
  })

  test('Le panneau de droite (export ou clips) est visible', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)
    // Right panel should have some content
    await expect(page.locator('aside, [class*="panel"]').first()).toBeVisible({ timeout: 10000 })
  })

  // ── Ajout de clips ────────────────────────────────────────────────────────

  test('Le bouton Importer une vidéo ouvre le modal', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)

    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.waitFor({ state: 'visible', timeout: 10000 })
    await importBtn.click()

    // Modal should appear
    await expect(page.getByRole('dialog').first()).toBeVisible({ timeout: 5000 })
  })

  test('Le modal d\'import affiche les vidéos du projet', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)

    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    // The video should appear in the modal
    await expect(page.getByText('test-video.mp4')).toBeVisible({ timeout: 5000 })
  })

  test('Fermer le modal d\'import', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)

    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Close with the ✕ button (aria-label="Fermer")
    await page.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  })

  test('Ajouter un clip depuis le modal', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)

    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })

    // Click on the video to add it
    const videoItem = page.getByRole('dialog').getByText('test-video.mp4')
    await videoItem.waitFor({ state: 'visible' })
    await videoItem.click()

    // The clip should appear somewhere (modal closes or clip is added)
    // Depending on implementation, it might auto-close or need confirmation
    const addBtn = page.getByRole('dialog').getByRole('button', { name: /Ajouter|Confirmer|OK/i })
    if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addBtn.click()
    }
  })

  // ── Panneau export ────────────────────────────────────────────────────────

  test('Le panneau d\'export de l\'assemblage est visible', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)
    await expect(
      page.getByText(/Export|Résolution|Transitions|exporter/i).first()
    ).toBeVisible({ timeout: 10000 })
  })

  test('Les options de résolution sont disponibles', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)

    // Need at least one clip to enable Export button
    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.waitFor({ state: 'visible', timeout: 10000 })
    await importBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByText('test-video.mp4').click()
    const confirmBtn = page.getByRole('dialog').getByRole('button', { name: /Ajouter|Confirmer|OK/i })
    if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) await confirmBtn.click()

    // Now Export button should be enabled
    const exportBtn = page.locator('.topbar').getByRole('button', { name: /Exporter/i })
    await expect(exportBtn).toBeEnabled({ timeout: 5000 })
    await exportBtn.click()
    // Resolution is a <select aria-label="Résolution"> — verify the select is visible
    await expect(page.getByRole('combobox', { name: /Résolution/i })).toBeVisible({ timeout: 5000 })
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  test('Le bouton Retour / Projet revient au projet', async ({ page }) => {
    await page.goto(`/assemblage/${projectId}`)
    // The back button in the topbar has the project name as text (btn-ghost btn-sm)
    const backBtn = page.locator('.topbar .btn-ghost').first()
    await backBtn.waitFor({ state: 'visible', timeout: 10000 })
    await backBtn.click()
    await page.waitForURL(/\/projects/)
  })
})
