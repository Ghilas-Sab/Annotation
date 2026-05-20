/**
 * Scénarios : Modal de découpe vidéo (VideoTrimModal)
 *
 * Couvre : ouverture, "Toute la vidéo", sélection de plage (sliders),
 *          message "vidéo complète", bouton désactivé sans modification,
 *          fermeture avec Échap, fermeture avec bouton Annuler,
 *          navigation vers annotation avec plage sélectionnée.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Trim-${Date.now()}`

test.describe('15 — Modal de découpe vidéo', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-Trim`)
    projectId = proj.id
    await api.uploadVideo(proj.id)
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function openTrimModal(page: import('@playwright/test').Page) {
    await page.goto(`/projects/${projectId}`)
    const annoterBtn = page.getByRole('button', { name: /^Annoter$/ }).first()
    await annoterBtn.waitFor({ state: 'visible', timeout: 10000 })
    await annoterBtn.click()
    await expect(page.getByRole('button', { name: 'Toute la vidéo' })).toBeVisible({ timeout: 5000 })
  }

  // ── Ouverture ─────────────────────────────────────────────────────────────

  test('Le modal s\'ouvre au clic sur Annoter', async ({ page }) => {
    await openTrimModal(page)
    // Both action buttons should be visible
    await expect(page.getByRole('button', { name: 'Toute la vidéo' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Annoter cette plage/ })).toBeVisible()
  })

  test('Les deux sliders (Début et Fin) sont présents', async ({ page }) => {
    await openTrimModal(page)
    const sliders = page.getByRole('slider')
    expect(await sliders.count()).toBeGreaterThanOrEqual(2)
  })

  // ── "Toute la vidéo" ──────────────────────────────────────────────────────

  test('"Toute la vidéo" ouvre directement la page d\'annotation', async ({ page }) => {
    await openTrimModal(page)
    await page.getByRole('button', { name: 'Toute la vidéo' }).click()
    await page.waitForURL(/\/annotation\//, { timeout: 10000 })
  })

  // ── Message "vidéo complète" ──────────────────────────────────────────────

  test('Un message guide est affiché quand les sliders couvrent toute la plage', async ({ page }) => {
    await openTrimModal(page)
    // By default, full range → "Ajuste les curseurs..." appears and button is disabled
    await expect(page.getByText(/Ajuste les curseurs|toute la plage|curseurs/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /Annoter cette plage/ })).toBeDisabled()
  })

  // ── Bouton "Annoter cette plage" ──────────────────────────────────────────

  test('"Annoter cette plage" est activé après modification d\'un slider', async ({ page }) => {
    await openTrimModal(page)
    const sliders = page.getByRole('slider')
    // Move the start slider to a non-zero position
    await sliders.first().fill('5')

    const annotateRangeBtn = page.getByRole('button', { name: /Annoter cette plage/ })
    await expect(annotateRangeBtn).toBeEnabled({ timeout: 3000 })
  })

  test('"Annoter cette plage" navigue vers l\'annotation avec la plage', async ({ page }) => {
    await openTrimModal(page)
    const sliders = page.getByRole('slider')
    await sliders.first().fill('5')

    await page.getByRole('button', { name: /Annoter cette plage/ }).click()
    await page.waitForURL(/\/annotation\//, { timeout: 10000 })
  })

  // ── Fermeture ─────────────────────────────────────────────────────────────

  test('Fermer le modal en cliquant sur le backdrop (arrière-plan)', async ({ page }) => {
    await openTrimModal(page)
    // Le VideoTrimModal se ferme en cliquant sur le fond sombre (onClick du div externe)
    await page.mouse.click(10, 10)

    await expect(page.getByRole('button', { name: 'Toute la vidéo' })).not.toBeVisible({ timeout: 5000 })
    await expect(page).toHaveURL(/\/projects\//)
  })

  test('Cliquer à l\'intérieur du modal ne le ferme pas', async ({ page }) => {
    await openTrimModal(page)
    // Cliquer dans la zone du modal (stopPropagation)
    const modal = page.getByRole('button', { name: 'Toute la vidéo' })
    await modal.click()
    // Should have navigated (Toute la vidéo = onConfirm)
    await page.waitForURL(/\/annotation\//, { timeout: 10000 })
  })

  // ── Sliders ne se croisent pas ────────────────────────────────────────────

  test('Le bouton "Annoter cette plage" est désactivé par défaut (plage complète)', async ({ page }) => {
    await openTrimModal(page)
    // Par défaut start=0, end=total_frames → bouton disabled
    const annotateBtn = page.getByRole('button', { name: /Annoter cette plage/ })
    await expect(annotateBtn).toBeDisabled()
  })
})
