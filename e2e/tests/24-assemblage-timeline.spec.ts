/**
 * Scénarios : AssemblageTimeline — fonctionnalités avancées
 *
 * Couvre : présence data-testid="assemblage-timeline", boutons zoom +/−,
 *          reset zoom, handles de trim (start/end), handle de réordonnancement,
 *          marqueurs d'annotation sur clip, règle temporelle visible,
 *          label "Vidéo" et durée, bouton Synchroniser présent (conditions non remplies),
 *          data-testid="source-video-volume-slider".
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-ATL-${Date.now()}`

test.describe('24 — AssemblageTimeline avancée', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let projectId: string
  let videoId: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)
    const proj = await api.createProject(`${RUN}-ATL`)
    projectId = proj.id
    const vid = await api.uploadVideo(proj.id, 'timeline-v.mp4')
    videoId = vid.id
    // Annotations pour que les marqueurs apparaissent dans la timeline
    await api.createAnnotation(vid.id, 5, 'Beat 1')
    await api.createAnnotation(vid.id, 15, 'Beat 2')
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  async function goToAssemblage(page: import('@playwright/test').Page) {
    await page.goto(`/assemblage/${projectId}`)
    await expect(page.getByText(/Assemblage|assemblage/i).first()).toBeVisible({ timeout: 15000 })
  }

  async function addClip(page: import('@playwright/test').Page) {
    const importBtn = page.getByRole('button', { name: /Importer|Ajouter|import/i }).first()
    await importBtn.waitFor({ state: 'visible', timeout: 10000 })
    await importBtn.click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5000 })
    await page.getByRole('dialog').getByText('timeline-v.mp4').first().click()
    const confirmBtn = page.getByRole('dialog').getByRole('button', { name: /Ajouter|Confirmer|OK/i })
    if (await confirmBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await confirmBtn.click()
    }
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 5000 })
  }

  // ── Présence de la timeline ───────────────────────────────────────────────

  test('La zone data-testid="assemblage-timeline" est présente', async ({ page }) => {
    await goToAssemblage(page)
    await expect(page.locator('[data-testid="assemblage-timeline"]')).toBeVisible({ timeout: 10000 })
  })

  test('Le label "Vidéo" est visible dans la colonne de pistes', async ({ page }) => {
    await goToAssemblage(page)
    // Le label de piste vidéo doit contenir "Vidéo"
    await expect(page.getByText('Vidéo').first()).toBeVisible({ timeout: 8000 })
  })

  // ── Boutons de zoom ───────────────────────────────────────────────────────

  test('Les boutons de zoom + et − sont présents dans la toolbar', async ({ page }) => {
    await goToAssemblage(page)
    // Buttons with text "+" and "−" (unicode minus)
    const plusBtn = page.getByRole('button', { name: '+' }).last()
    const minusBtn = page.getByRole('button', { name: '−' }).last()
    await expect(plusBtn).toBeVisible({ timeout: 8000 })
    await expect(minusBtn).toBeVisible({ timeout: 8000 })
  })

  test('Cliquer sur zoom + ne cause pas d\'erreur', async ({ page }) => {
    await goToAssemblage(page)
    const plusBtn = page.getByRole('button', { name: '+' }).last()
    await plusBtn.click()
    await expect(page.locator('body')).toBeVisible()
  })

  test('Le bouton ×1 (reset zoom) apparaît après avoir zoomé', async ({ page }) => {
    await goToAssemblage(page)
    const plusBtn = page.getByRole('button', { name: '+' }).last()
    await plusBtn.click()
    // Après zoom, le bouton "×1" de reset doit apparaître
    await expect(page.getByRole('button', { name: '×1' })).toBeVisible({ timeout: 5000 })
  })

  test('Cliquer sur ×1 reset le zoom et masque le bouton', async ({ page }) => {
    await goToAssemblage(page)
    const plusBtn = page.getByRole('button', { name: '+' }).last()
    await plusBtn.click()
    await page.getByRole('button', { name: '×1' }).click()
    await expect(page.getByRole('button', { name: '×1' })).not.toBeVisible({ timeout: 5000 })
  })

  // ── Contrôle de volume vidéo ─────────────────────────────────────────────

  test('Le slider de volume de la piste vidéo est présent', async ({ page }) => {
    await goToAssemblage(page)
    await expect(
      page.locator('[data-testid="source-video-volume-slider"]')
    ).toBeVisible({ timeout: 8000 })
  })

  // ── Bouton Synchroniser ───────────────────────────────────────────────────

  test('Le bouton Synchroniser est présent (désactivé sans piste audio)', async ({ page }) => {
    await goToAssemblage(page)
    const syncBtn = page.getByRole('button', { name: /Synchroniser/i })
    await expect(syncBtn).toBeVisible({ timeout: 8000 })
    // Sans piste audio ni BPM, le bouton doit être désactivé
    await expect(syncBtn).toBeDisabled()
  })

  // ── Handles de trim et réordonnancement (avec clip) ───────────────────────

  test('Les handles de trim start/end sont présents après ajout d\'un clip', async ({ page }) => {
    await goToAssemblage(page)
    await addClip(page)

    await expect(
      page.locator('[data-testid="video-trim-start-handle"]').first()
    ).toBeVisible({ timeout: 8000 })
    await expect(
      page.locator('[data-testid="video-trim-end-handle"]').first()
    ).toBeVisible({ timeout: 8000 })
  })

  test('Le handle de réordonnancement est présent sur le clip', async ({ page }) => {
    await goToAssemblage(page)
    await addClip(page)

    // data-testid="video-reorder-handle-{id}" — contient aria-label="Déplacer"
    const handle = page.locator('[data-testid^="video-reorder-handle-"]').first()
    await expect(handle).toBeVisible({ timeout: 8000 })
  })

  test('Le clip a un data-testid="video-clip-{id}"', async ({ page }) => {
    await goToAssemblage(page)
    await addClip(page)

    const clip = page.locator('[data-testid^="video-clip-"]').first()
    await expect(clip).toBeVisible({ timeout: 8000 })
  })

  // ── Marqueurs d'annotation sur le clip ───────────────────────────────────

  test('Les marqueurs d\'annotation apparaissent sur le clip dans la timeline', async ({ page }) => {
    await goToAssemblage(page)
    await addClip(page)

    // Les marqueurs ont data-testid="annotation-marker-{id}"
    const markers = page.locator('[data-testid^="annotation-marker-"]')
    // Les annotations créées dans beforeAll doivent apparaître
    await expect(markers.first()).toBeVisible({ timeout: 8000 })
  })

  // ── Durée totale affichée ─────────────────────────────────────────────────

  test('La durée totale de la timeline est affichée après ajout d\'un clip', async ({ page }) => {
    await goToAssemblage(page)
    await addClip(page)

    // Le composant affiche "🎬 Xs" ou "🎬 Xm..." dans la toolbar
    await expect(page.getByText(/🎬/).first()).toBeVisible({ timeout: 5000 })
  })
})
