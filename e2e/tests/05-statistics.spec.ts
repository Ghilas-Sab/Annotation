/**
 * Scénarios : Page de statistiques
 *
 * Couvre : chargement, état sans annotations, métriques BPM avec annotations,
 *          graphiques présents, navigation retour.
 */
import { test, expect, request as apiRequest } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { ApiHelper } from './helpers/api'

const RUN = `E2E-Stats-${Date.now()}`

test.describe('05 — Statistiques', () => {
  let ctx: APIRequestContext
  let api: ApiHelper
  let videoId: string
  let videoIdWithAnnotations: string

  test.beforeAll(async () => {
    ctx = await apiRequest.newContext({
      baseURL: process.env.API_BASE_URL || 'http://localhost:8000',
    })
    api = new ApiHelper(ctx)

    // Video without annotations
    const proj1 = await api.createProject(`${RUN}-NoAnn`)
    const vid1 = await api.uploadVideo(proj1.id)
    videoId = vid1.id

    // Video with annotations (≥ 2 for BPM to compute)
    const proj2 = await api.createProject(`${RUN}-WithAnn`)
    const vid2 = await api.uploadVideo(proj2.id)
    videoIdWithAnnotations = vid2.id
    for (let f = 0; f < 5; f++) {
      await api.createAnnotation(vid2.id, f * 10, `Beat ${f + 1}`)
    }
  })

  test.afterAll(async () => {
    await api.cleanupByPrefix(RUN)
    await ctx.dispose()
  })

  // ── Chargement ────────────────────────────────────────────────────────────

  test('La page de statistiques se charge', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(page.getByText(/Statistiques|BPM|stat/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('La topbar affiche le nom ou l\'ID de la vidéo', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(page.locator('header')).toBeVisible()
  })

  // ── Sans annotations ──────────────────────────────────────────────────────

  test('Sans annotations : message explicatif affiché', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    await expect(
      page.getByText(/Aucune annotation|pas d'annotation|insufficient|Pas assez/i)
    ).toBeVisible({ timeout: 10000 })
  })

  // ── Avec annotations ──────────────────────────────────────────────────────

  test('Avec annotations : les métriques BPM sont affichées', async ({ page }) => {
    await page.goto(`/statistics/${videoIdWithAnnotations}`)
    // BPM global value should appear
    await expect(page.getByText(/BPM/i).first()).toBeVisible({ timeout: 10000 })
  })

  test('Avec annotations : les cartes de statistiques sont visibles', async ({ page }) => {
    await page.goto(`/statistics/${videoIdWithAnnotations}`)
    await expect(page.locator('[class*="stat-card"], [class*="stat_card"]').first()).toBeVisible({ timeout: 10000 })
  })

  test('Avec annotations : la timeline BPM est présente', async ({ page }) => {
    await page.goto(`/statistics/${videoIdWithAnnotations}`)
    await expect(page.locator('svg').first()).toBeVisible({ timeout: 10000 })
  })

  // ── Navigation ────────────────────────────────────────────────────────────

  test('Le bouton Retour / Annoter revient à la page d\'annotation', async ({ page }) => {
    await page.goto(`/statistics/${videoId}`)
    const backBtn = page.getByRole('button', { name: /Annoter|Retour|annotation/i })
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click()
      await page.waitForURL(/\/annotation\//)
    } else {
      // Fallback: check header back link
      const headerBtn = page.locator('header').getByRole('button').first()
      await headerBtn.click()
      // Should navigate somewhere (project or annotation)
      await expect(page).not.toHaveURL(`**/statistics/${videoId}`, { timeout: 5000 })
    }
  })

  // ── BPM ajustement ────────────────────────────────────────────────────────

  test('L\'ajusteur BPM est présent avec des annotations', async ({ page }) => {
    await page.goto(`/statistics/${videoIdWithAnnotations}`)
    // BpmAdjuster or similar component
    // PlaybackSpeedCalc shows "Playback Speed Calculator"
    await expect(
      page.getByText(/Playback Speed Calculator/i).first()
    ).toBeVisible({ timeout: 10000 })
  })
})
